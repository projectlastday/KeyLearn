<?php

namespace App\Http\Controllers;

use App\Models\Widget;
use App\Models\Workspace;
use App\Support\WidgetData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WidgetController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'workspace_id' => 'required|exists:workspaces,id',
            'type' => 'required|string|in:note,chat,reminder,todo,timer,whiteboard,pdf,youtube',
            'title' => 'required|string|max:100',
            'size_preset' => 'nullable|string|in:S,M,L',
        ]);

        $workspace = Workspace::findOrFail($validated['workspace_id']);
        abort_unless($workspace->user_id === $request->user()->id, 403);

        $activeCount = $workspace->widgets()->count();
        if ($activeCount >= 50) {
            return response()->json([
                'message' => 'Batas maksimal 50 widget per folder telah tercapai.',
            ], 422);
        }

        $sizePreset = $validated['size_preset'] ?? 'M';
        [$gridW, $gridH] = $this->presetToSize($sizePreset);
        $nextSort = (int) $workspace->widgets()->max('sort_order') + 1;

        $widget = DB::transaction(function () use ($workspace, $request, $validated, $sizePreset, $gridW, $gridH, $nextSort) {
            $chatSessionId = null;
            if ($validated['type'] === 'chat') {
                $chatSession = $workspace->chatSessions()->create([
                    'title' => $validated['title'],
                    'selected_ai_model' => 'gemini-2.5-flash',
                ]);
                $chatSessionId = $chatSession->id;
            }

            $widget = $workspace->widgets()->create([
                'created_by' => $request->user()->id,
                'chat_session_id' => $chatSessionId,
                'type' => $validated['type'],
                'title' => $validated['title'],
                'size_preset' => $sizePreset,
                'grid_x' => 1,
                'grid_y' => $nextSort,
                'grid_w' => $gridW,
                'grid_h' => $gridH,
                'sort_order' => $nextSort,
            ]);

            if ($widget->type === 'note') {
                $widget->note()->create([
                    'content' => '',
                    'text_size' => 'normal',
                ]);
            }

            if ($widget->type === 'whiteboard') {
                $widget->whiteboard()->create([
                    'strokes' => [],
                ]);
            }

            if ($widget->type === 'todo') {
                foreach (['belum', 'sedang dilakukan', 'selesai dilakukan'] as $index => $name) {
                    $widget->todoStatuses()->create([
                        'name' => $name,
                        'is_system' => true,
                        'sort_order' => $index,
                    ]);
                }
            }

            if ($widget->type === 'timer') {
                $widget->timer()->create([
                    'elapsed_seconds' => 0,
                    'is_running' => false,
                    'started_at' => null,
                ]);
            }

            return $widget;
        });

        $widget->load(['note', 'youtube', 'pdf', 'whiteboard', 'chatSession', 'reminders', 'todoStatuses', 'todoItems.status', 'timer']);

        return response()->json(WidgetData::widget($widget), 201);
    }

    public function update(Request $request, Widget $widget): JsonResponse
    {
        $this->authorizeWidget($request, $widget);

        $validated = $request->validate([
            'title' => 'nullable|string|max:100',
            'size_preset' => 'nullable|string|in:S,M,L',
            'grid_x' => 'nullable|integer|min:1|max:12',
            'grid_y' => 'nullable|integer|min:1|max:1000',
            'grid_w' => 'nullable|integer|min:1|max:12',
            'grid_h' => 'nullable|integer|min:1|max:1000',
            'sort_order' => 'nullable|integer|min:0|max:10000',
        ]);

        if (array_key_exists('size_preset', $validated)) {
            [$gridW, $gridH] = $this->presetToSize($validated['size_preset']);
            $validated['grid_w'] = $gridW;
            $validated['grid_h'] = $gridH;
        }

        $widget->update($validated);
        if (array_key_exists('title', $validated) && $widget->type === 'chat' && $widget->chatSession) {
            $widget->chatSession->update(['title' => $validated['title']]);
        }

        $widget->load(['note', 'youtube', 'pdf', 'whiteboard', 'chatSession', 'reminders', 'todoStatuses', 'todoItems.status', 'timer']);

        return response()->json(WidgetData::widget($widget->fresh(['note', 'youtube', 'pdf', 'whiteboard', 'chatSession', 'reminders', 'todoStatuses', 'todoItems.status', 'timer'])));
    }

    public function destroy(Request $request, Widget $widget): JsonResponse
    {
        $this->authorizeWidget($request, $widget);

        DB::transaction(function () use ($widget) {
            if ($widget->type === 'chat' && $widget->chatSession) {
                $widget->chatSession->delete();
            }
            $widget->delete();
        });

        return response()->json(null, 204);
    }

    public function reorder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'workspace_id' => 'required|exists:workspaces,id',
            'widgets' => 'required|array',
            'widgets.*.id' => 'required|integer|exists:widgets,id',
            'widgets.*.sort_order' => 'required|integer|min:0|max:10000',
            'widgets.*.grid_x' => 'nullable|integer|min:1|max:12',
            'widgets.*.grid_y' => 'nullable|integer|min:1|max:1000',
        ]);

        $workspace = Workspace::findOrFail($validated['workspace_id']);
        abort_unless($workspace->user_id === $request->user()->id, 403);

        foreach ($validated['widgets'] as $item) {
            $widget = Widget::where('workspace_id', $workspace->id)->findOrFail($item['id']);
            $widget->update([
                'sort_order' => $item['sort_order'],
                'grid_x' => $item['grid_x'] ?? $widget->grid_x,
                'grid_y' => $item['grid_y'] ?? $widget->grid_y,
            ]);
        }

        return response()->json(['message' => 'Urutan widget diperbarui.']);
    }

    public function resize(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'widget_id' => 'required|integer|exists:widgets,id',
            'size_preset' => 'required|string|in:S,M,L',
        ]);

        $widget = Widget::findOrFail($validated['widget_id']);
        $this->authorizeWidget($request, $widget);

        [$gridW, $gridH] = $this->presetToSize($validated['size_preset']);
        $widget->update([
            'size_preset' => $validated['size_preset'],
            'grid_w' => $gridW,
            'grid_h' => $gridH,
        ]);

        return response()->json(WidgetData::widget($widget->fresh(['note', 'youtube', 'pdf', 'whiteboard', 'chatSession', 'reminders', 'todoStatuses', 'todoItems.status', 'timer'])));
    }

    private function authorizeWidget(Request $request, Widget $widget): void
    {
        $workspace = $widget->workspace;
        abort_unless($workspace && $workspace->user_id === $request->user()->id, 403);
    }

    private function presetToSize(string $preset): array
    {
        return match ($preset) {
            'S' => [3, 2],
            'L' => [6, 4],
            default => [6, 2],
        };
    }
}
