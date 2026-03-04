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
        ]);

        $note = $widget->note()->updateOrCreate(
            ['widget_id' => $widget->id],
            ['content' => $validated['content'] ?? '']
        );

        return response()->json([
            'widget_id' => $widget->id,
            'note_id' => $note->id,
            'content' => $note->content,
        ]);
    }
}
