<?php

namespace App\Http\Controllers;

use App\Models\Widget;
use App\Models\WidgetTodoItem;
use App\Models\WidgetTodoStatus;
use App\Support\WidgetData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WidgetTodoController extends Controller
{
    public function storeItem(Request $request, Widget $widget): JsonResponse
    {
        $this->authorizeTodoWidget($request, $widget);

        $validated = $request->validate([
            'content' => 'required|string|max:500',
            'status_id' => 'nullable|integer|exists:widget_todo_statuses,id',
            'sort_order' => 'nullable|integer|min:0|max:10000',
        ]);

        $status = $this->resolveStatusForWidget($widget, $validated['status_id'] ?? null);
        $nextSort = (int) $widget->todoItems()->max('sort_order') + 1;

        $item = $widget->todoItems()->create([
            'status_id' => $status->id,
            'content' => trim($validated['content']),
            'sort_order' => $validated['sort_order'] ?? $nextSort,
        ]);

        return response()->json(WidgetData::todoItem($item->fresh('status')), 201);
    }

    public function updateItem(Request $request, WidgetTodoItem $item): JsonResponse
    {
        $widget = $item->widget;
        abort_unless($widget, 404);
        $this->authorizeTodoWidget($request, $widget);

        $validated = $request->validate([
            'content' => 'nullable|string|max:500',
            'status_id' => 'nullable|integer|exists:widget_todo_statuses,id',
            'sort_order' => 'nullable|integer|min:0|max:10000',
        ]);

        $payload = [];

        if (array_key_exists('content', $validated)) {
            $payload['content'] = trim($validated['content']);
        }

        if (array_key_exists('status_id', $validated)) {
            $status = $this->resolveStatusForWidget($widget, $validated['status_id']);
            $payload['status_id'] = $status->id;
        }

        if (array_key_exists('sort_order', $validated)) {
            $payload['sort_order'] = $validated['sort_order'];
        }

        if (!empty($payload)) {
            $item->update($payload);
        }

        return response()->json(WidgetData::todoItem($item->fresh('status')));
    }

    public function destroyItem(Request $request, WidgetTodoItem $item): JsonResponse
    {
        $widget = $item->widget;
        abort_unless($widget, 404);
        $this->authorizeTodoWidget($request, $widget);

        $item->delete();

        return response()->json(null, 204);
    }

    public function reorderItems(Request $request, Widget $widget): JsonResponse
    {
        $this->authorizeTodoWidget($request, $widget);

        $validated = $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|integer|exists:widget_todo_items,id',
            'items.*.sort_order' => 'required|integer|min:0|max:10000',
        ]);

        foreach ($validated['items'] as $itemData) {
            $item = $widget->todoItems()->findOrFail($itemData['id']);
            $item->update([
                'sort_order' => $itemData['sort_order'],
            ]);
        }

        return response()->json(['message' => 'Urutan tugas berhasil diperbarui.']);
    }

    public function storeStatus(Request $request, Widget $widget): JsonResponse
    {
        $this->authorizeTodoWidget($request, $widget);

        $validated = $request->validate([
            'name' => 'required|string|max:80',
            'sort_order' => 'nullable|integer|min:0|max:1000',
        ]);

        $name = trim($validated['name']);
        $exists = $widget->todoStatuses()
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'Status dengan nama tersebut sudah ada.'], 422);
        }

        $nextSort = (int) $widget->todoStatuses()->max('sort_order') + 1;
        $status = $widget->todoStatuses()->create([
            'name' => $name,
            'is_system' => false,
            'sort_order' => $validated['sort_order'] ?? $nextSort,
        ]);

        return response()->json(WidgetData::todoStatus($status), 201);
    }

    public function updateStatus(Request $request, WidgetTodoStatus $status): JsonResponse
    {
        $widget = $status->widget;
        abort_unless($widget, 404);
        $this->authorizeTodoWidget($request, $widget);

        $validated = $request->validate([
            'name' => 'nullable|string|max:80',
            'sort_order' => 'nullable|integer|min:0|max:1000',
        ]);

        if ($status->is_system && array_key_exists('name', $validated)) {
            return response()->json(['message' => 'Nama status bawaan tidak dapat diubah.'], 422);
        }

        $payload = [];

        if (array_key_exists('name', $validated)) {
            $name = trim($validated['name']);
            $exists = $widget->todoStatuses()
                ->where('id', '!=', $status->id)
                ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
                ->exists();

            if ($exists) {
                return response()->json(['message' => 'Status dengan nama tersebut sudah ada.'], 422);
            }

            $payload['name'] = $name;
        }

        if (array_key_exists('sort_order', $validated)) {
            $payload['sort_order'] = $validated['sort_order'];
        }

        if (!empty($payload)) {
            $status->update($payload);
        }

        return response()->json(WidgetData::todoStatus($status->fresh()));
    }

    public function destroyStatus(Request $request, WidgetTodoStatus $status): JsonResponse
    {
        $widget = $status->widget;
        abort_unless($widget, 404);
        $this->authorizeTodoWidget($request, $widget);

        if ($status->is_system) {
            return response()->json(['message' => 'Status bawaan tidak dapat dihapus.'], 422);
        }

        $validated = $request->validate([
            'target_status_id' => 'required|integer|exists:widget_todo_statuses,id',
        ]);

        $targetStatus = $widget->todoStatuses()->findOrFail($validated['target_status_id']);
        abort_if($targetStatus->id === $status->id, 422, 'Status tujuan harus berbeda.');

        DB::transaction(function () use ($status, $targetStatus) {
            $status->items()->update([
                'status_id' => $targetStatus->id,
            ]);
            $status->delete();
        });

        return response()->json(['message' => 'Status berhasil dihapus.']);
    }

    private function authorizeTodoWidget(Request $request, Widget $widget): void
    {
        $workspace = $widget->workspace;
        abort_unless($workspace && $workspace->user_id === $request->user()->id, 403);

        if ($widget->type !== 'todo') {
            abort(response()->json([
                'message' => 'Widget ini bukan tipe to-do.',
            ], 422));
        }
    }

    private function resolveStatusForWidget(Widget $widget, ?int $statusId): WidgetTodoStatus
    {
        if ($statusId) {
            return $widget->todoStatuses()->findOrFail($statusId);
        }

        $defaultStatus = $widget->todoStatuses()
            ->whereRaw('LOWER(name) = ?', ['belum'])
            ->first();

        return $defaultStatus ?: $widget->todoStatuses()->orderBy('sort_order')->firstOrFail();
    }
}
