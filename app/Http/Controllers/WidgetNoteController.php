<?php

namespace App\Http\Controllers;

use App\Models\Widget;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WidgetNoteController extends Controller
{
    public function update(Request $request, Widget $widget): JsonResponse
    {
        $workspace = $widget->workspace;
        abort_unless($workspace && $workspace->user_id === $request->user()->id, 403);

        if ($widget->type !== 'note') {
            return response()->json([
                'message' => 'Widget ini bukan tipe catatan.',
            ], 422);
        }

        $validated = $request->validate([
            'content' => 'nullable|string',
            'text_size' => 'nullable|string|in:small,normal,large',
        ]);

        $existingNote = $widget->note;
        $content = array_key_exists('content', $validated)
            ? ($validated['content'] ?? '')
            : ($existingNote?->content ?? '');
        $textSize = array_key_exists('text_size', $validated)
            ? $validated['text_size']
            : ($existingNote?->text_size ?? 'normal');

        $note = $widget->note()->updateOrCreate(
            ['widget_id' => $widget->id],
            [
                'content' => $content,
                'text_size' => $textSize,
            ]
        );

        return response()->json([
            'widget_id' => $widget->id,
            'note_id' => $note->id,
            'content' => $note->content,
            'text_size' => $note->text_size,
        ]);
    }
}
