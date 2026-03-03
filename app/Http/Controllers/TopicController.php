<?php

namespace App\Http\Controllers;

use App\Models\Topic;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TopicController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $topics = $request->user()->topics()->orderBy('name')->get();

        return response()->json($topics);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
        ]);

        $exists = $request->user()->topics()->where('name', $validated['name'])->exists();
        if ($exists) {
            return response()->json(['message' => 'Topik dengan nama ini sudah ada.'], 422);
        }

        $topic = $request->user()->topics()->create($validated);

        return response()->json($topic, 201);
    }

    public function update(Request $request, Topic $topic): JsonResponse
    {
        abort_unless($topic->user_id === $request->user()->id, 403);

        $validated = $request->validate([
            'name' => 'required|string|max:100',
        ]);

        $exists = $request->user()->topics()
            ->where('name', $validated['name'])
            ->where('id', '!=', $topic->id)
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'Topik dengan nama ini sudah ada.'], 422);
        }

        $topic->update($validated);

        return response()->json($topic);
    }

    public function destroy(Request $request, Topic $topic): JsonResponse
    {
        abort_unless($topic->user_id === $request->user()->id, 403);

        $topic->delete();

        return response()->json(null, 204);
    }
}
