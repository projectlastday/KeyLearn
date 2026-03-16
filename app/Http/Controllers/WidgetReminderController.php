<?php

namespace App\Http\Controllers;

use App\Models\Widget;
use App\Models\WidgetReminder;
use App\Services\ReminderProcessor;
use App\Support\WidgetData;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class WidgetReminderController extends Controller
{
    public function store(Request $request, Widget $widget): JsonResponse
    {
        $this->authorizeReminderWidget($request, $widget);
        if ($widget->reminders()->exists()) {
            return response()->json([
                'message' => 'Widget ini hanya mendukung 1 pengingat.',
            ], 422);
        }

        [$validated, $remindAt] = $this->validatedReminderPayload($request);

        $item = $widget->reminders()->create([
            'message' => $validated['message'],
            'remind_at' => $remindAt,
            'timezone' => 'Asia/Jakarta',
            'send_whatsapp' => (bool) ($validated['send_whatsapp'] ?? false),
        ]);

        return response()->json(WidgetData::reminderItem($item), 201);
    }

    public function update(Request $request, WidgetReminder $item): JsonResponse
    {
        $this->authorizeReminderItem($request, $item);

        [$validated, $remindAt] = $this->validatedReminderPayload($request);

        $item->update([
            'message' => $validated['message'],
            'remind_at' => $remindAt,
            'timezone' => 'Asia/Jakarta',
            'send_whatsapp' => (bool) ($validated['send_whatsapp'] ?? false),
            'triggered_at' => null,
            'in_app_seen_at' => null,
            'whatsapp_sent_at' => null,
            'whatsapp_attempt_count' => 0,
            'last_whatsapp_attempt_at' => null,
            'whatsapp_last_error' => null,
        ]);

        return response()->json(WidgetData::reminderItem($item->fresh()));
    }

    public function destroy(Request $request, WidgetReminder $item): JsonResponse
    {
        $this->authorizeReminderItem($request, $item);

        $item->delete();

        return response()->json(null, 204);
    }

    public function due(Request $request): JsonResponse
    {
        // Fallback processing for environments where scheduler is not active.
        app(ReminderProcessor::class)->processWithStats();

        $now = now('Asia/Jakarta');

        WidgetReminder::query()
            ->whereNull('triggered_at')
            ->where('remind_at', '<=', $now)
            ->whereHas('widget', function ($query) use ($request) {
                $query->whereNull('widgets.deleted_at')
                    ->whereHas('workspace', function ($workspaceQuery) use ($request) {
                        $workspaceQuery->whereNull('workspaces.deleted_at')
                            ->where('user_id', $request->user()->id);
                    });
            })
            ->update([
                'triggered_at' => $now,
            ]);

        $items = WidgetReminder::query()
            ->with(['widget.workspace'])
            ->whereNotNull('triggered_at')
            ->whereNull('in_app_seen_at')
            ->whereHas('widget', function ($query) use ($request) {
                $query->whereNull('widgets.deleted_at')
                    ->whereHas('workspace', function ($workspaceQuery) use ($request) {
                        $workspaceQuery->whereNull('workspaces.deleted_at')
                            ->where('user_id', $request->user()->id);
                    });
            })
            ->orderBy('triggered_at')
            ->get()
            ->map(function (WidgetReminder $item) {
                return [
                    'id' => $item->id,
                    'message' => $item->message,
                    'remind_at' => $item->remind_at?->toISOString(),
                    'widget_id' => $item->widget_id,
                    'widget_title' => $item->widget?->title,
                    'workspace_id' => $item->widget?->workspace?->id,
                    'workspace_title' => $item->widget?->workspace?->title,
                ];
            })
            ->values()
            ->toArray();

        return response()->json($items);
    }

    public function acknowledge(Request $request, WidgetReminder $item): JsonResponse
    {
        $this->authorizeReminderItem($request, $item);

        $item->update([
            'in_app_seen_at' => now('Asia/Jakarta'),
        ]);

        return response()->json(['message' => 'Pengingat ditandai sudah dilihat.']);
    }

    private function authorizeReminderWidget(Request $request, Widget $widget): void
    {
        $workspace = $widget->workspace;
        abort_unless($workspace && $workspace->user_id === $request->user()->id, 403);
        if ($widget->type !== 'reminder') {
            abort(response()->json([
                'message' => 'Widget ini bukan tipe pengingat.',
            ], 422));
        }
    }

    private function authorizeReminderItem(Request $request, WidgetReminder $item): void
    {
        $widget = $item->widget;
        abort_unless($widget, 404);
        $this->authorizeReminderWidget($request, $widget);
    }

    private function validatedReminderPayload(Request $request): array
    {
        $validated = $request->validate([
            'message' => 'required|string|max:500',
            'remind_date' => 'required|date_format:Y-m-d',
            'remind_time' => ['required', 'string', 'regex:/^\d{2}:\d{2}(:\d{2})?$/'],
            'send_whatsapp' => 'nullable|boolean',
        ]);

        $timeFormat = str_contains($validated['remind_time'], ':') && substr_count($validated['remind_time'], ':') === 2
            ? 'Y-m-d H:i:s'
            : 'Y-m-d H:i';
        $remindAt = Carbon::createFromFormat($timeFormat, "{$validated['remind_date']} {$validated['remind_time']}", 'Asia/Jakarta');

        if ($remindAt->lessThanOrEqualTo(now('Asia/Jakarta'))) {
            throw ValidationException::withMessages([
                'remind_time' => 'Waktu pengingat harus lebih dari sekarang.',
            ]);
        }

        return [$validated, $remindAt];
    }
}
