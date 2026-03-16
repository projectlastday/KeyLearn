<?php

namespace App\Support;

use App\Models\Widget;
use App\Models\WidgetPdf;
use App\Models\WidgetReminder;
use App\Models\WidgetTimer;
use App\Models\WidgetTodoItem;
use App\Models\WidgetTodoStatus;
use App\Models\WidgetWhiteboard;
use App\Models\WidgetYoutube;

class WidgetData
{
    public static function widget(Widget $widget): array
    {
        return [
            'id' => $widget->id,
            'workspace_id' => $widget->workspace_id,
            'type' => $widget->type,
            'title' => $widget->title,
            'size_preset' => $widget->size_preset,
            'grid_x' => $widget->grid_x,
            'grid_y' => $widget->grid_y,
            'grid_w' => $widget->grid_w,
            'grid_h' => $widget->grid_h,
            'sort_order' => $widget->sort_order,
            'chat_session_id' => $widget->chat_session_id,
            'chat' => $widget->chatSession ? [
                'id' => $widget->chatSession->id,
                'updated_at' => $widget->chatSession->updated_at?->toISOString(),
            ] : null,
            'note' => $widget->note ? [
                'id' => $widget->note->id,
                'content' => $widget->note->content,
                'text_size' => $widget->note->text_size ?? 'normal',
            ] : null,
            'youtube' => $widget->relationLoaded('youtube') && $widget->youtube
                ? self::youtube($widget->youtube)
                : null,
            'pdf' => $widget->relationLoaded('pdf') && $widget->pdf
                ? self::pdf($widget, $widget->pdf)
                : null,
            'whiteboard' => $widget->whiteboard
                ? self::whiteboard($widget->whiteboard)
                : null,
            'reminders' => $widget->relationLoaded('reminders')
                ? $widget->reminders->map(fn (WidgetReminder $item) => self::reminderItem($item))->values()->toArray()
                : [],
            'todo_statuses' => $widget->relationLoaded('todoStatuses')
                ? $widget->todoStatuses->map(fn (WidgetTodoStatus $status) => self::todoStatus($status))->values()->toArray()
                : [],
            'todo_items' => $widget->relationLoaded('todoItems')
                ? $widget->todoItems->map(fn (WidgetTodoItem $item) => self::todoItem($item))->values()->toArray()
                : [],
            'timer' => $widget->relationLoaded('timer') && $widget->timer
                ? self::timer($widget->timer)
                : null,
        ];
    }

    public static function reminderItem(WidgetReminder $item): array
    {
        $remindAt = $item->remind_at?->copy()->timezone('Asia/Jakarta');

        return [
            'id' => $item->id,
            'message' => $item->message,
            'remind_at' => $item->remind_at?->toISOString(),
            'created_at' => $item->created_at?->toISOString(),
            'updated_at' => $item->updated_at?->toISOString(),
            'remind_date' => $remindAt?->format('Y-m-d'),
            'remind_time' => $remindAt?->format('H:i:s'),
            'timezone' => $item->timezone,
            'send_whatsapp' => (bool) $item->send_whatsapp,
            'triggered_at' => $item->triggered_at?->toISOString(),
            'in_app_seen_at' => $item->in_app_seen_at?->toISOString(),
            'whatsapp_sent_at' => $item->whatsapp_sent_at?->toISOString(),
            'whatsapp_attempt_count' => $item->whatsapp_attempt_count,
            'whatsapp_last_error' => $item->whatsapp_last_error,
        ];
    }

    public static function pdf(Widget $widget, WidgetPdf $pdf): array
    {
        return [
            'id' => $pdf->id,
            'widget_id' => $pdf->widget_id,
            'has_file' => filled($pdf->path),
            'file_name' => $pdf->original_name,
            'file_size' => (int) $pdf->size,
            'mime_type' => $pdf->mime_type ?: 'application/pdf',
            'file_url' => route('widget-pdfs.file', ['widget' => $widget->id]),
            'last_page' => max(1, (int) $pdf->last_page),
            'updated_at' => $pdf->updated_at?->toISOString(),
        ];
    }

    public static function youtube(WidgetYoutube $youtube): array
    {
        return [
            'id' => $youtube->id,
            'widget_id' => $youtube->widget_id,
            'source_url' => $youtube->source_url,
            'video_id' => $youtube->video_id,
            'watch_url' => "https://www.youtube.com/watch?v={$youtube->video_id}",
            'embed_url' => "https://www.youtube-nocookie.com/embed/{$youtube->video_id}?rel=0&modestbranding=1",
            'updated_at' => $youtube->updated_at?->toISOString(),
        ];
    }

    public static function todoStatus(WidgetTodoStatus $status): array
    {
        return [
            'id' => $status->id,
            'widget_id' => $status->widget_id,
            'name' => $status->name,
            'is_system' => (bool) $status->is_system,
            'sort_order' => (int) $status->sort_order,
        ];
    }

    public static function todoItem(WidgetTodoItem $item): array
    {
        return [
            'id' => $item->id,
            'widget_id' => $item->widget_id,
            'status_id' => $item->status_id,
            'content' => $item->content,
            'sort_order' => (int) $item->sort_order,
            'created_at' => $item->created_at?->toISOString(),
            'updated_at' => $item->updated_at?->toISOString(),
            'status' => $item->relationLoaded('status') && $item->status
                ? self::todoStatus($item->status)
                : null,
        ];
    }

    public static function whiteboard(WidgetWhiteboard $whiteboard): array
    {
        return [
            'id' => $whiteboard->id,
            'widget_id' => $whiteboard->widget_id,
            'strokes' => $whiteboard->strokes ?? [],
            'updated_at' => $whiteboard->updated_at?->toISOString(),
        ];
    }

    public static function timer(WidgetTimer $timer): array
    {
        return [
            'id' => $timer->id,
            'widget_id' => $timer->widget_id,
            'elapsed_seconds' => (int) $timer->elapsed_seconds,
            'is_running' => (bool) $timer->is_running,
            'started_at' => $timer->started_at?->toISOString(),
            'updated_at' => $timer->updated_at?->toISOString(),
        ];
    }
}
