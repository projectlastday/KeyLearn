<?php

namespace App\Http\Controllers;

use App\Models\Widget;
use App\Support\WidgetData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WidgetWhiteboardController extends Controller
{
    public function update(Request $request, Widget $widget): JsonResponse
    {
        $workspace = $widget->workspace;
        abort_unless($workspace && $workspace->user_id === $request->user()->id, 403);

        if ($widget->type !== 'whiteboard') {
            return response()->json([
                'message' => 'Widget ini bukan tipe whiteboard.',
            ], 422);
        }

        $validated = $request->validate([
            'strokes' => 'present|array|max:500',
            'strokes.*.tool' => 'required|string|in:pen,eraser',
            'strokes.*.color' => 'nullable|string|in:red,black,blue',
            'strokes.*.size' => 'required|string|in:S,M,L',
            'strokes.*.points' => 'required|array|min:1|max:2000',
            'strokes.*.points.*.x' => 'required|numeric|min:0|max:1',
            'strokes.*.points.*.y' => 'required|numeric|min:0|max:1',
        ]);

        $whiteboard = $widget->whiteboard()->updateOrCreate(
            ['widget_id' => $widget->id],
            ['strokes' => $validated['strokes']]
        );

        return response()->json([
            'widget_id' => $widget->id,
            'whiteboard' => WidgetData::whiteboard($whiteboard->fresh()),
        ]);
    }
}
