<?php

namespace App\Http\Controllers;

use App\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WorkspaceController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $topics = $user->topics()->orderBy('name')->get();

        $workspaces = $user->workspaces()
            ->with([
                'topic',
                'chatSessions' => function ($query) {
                    $query->orderBy('updated_at', 'desc')->limit(20);
                },
                'widgets' => function ($query) {
                    $query->with(['note', 'chatSession'])->orderBy('sort_order');
                },
            ])
            ->orderBy('updated_at', 'desc')
            ->get()
            ->map(function ($workspace) {
                return [
                    'id' => $workspace->id,
                    'title' => $workspace->title,
                    'topic' => $workspace->topic->name,
                    'topic_id' => $workspace->topic_id,
                    'chats' => $workspace->chatSessions->map(function ($chat) {
                        return [
                            'id' => $chat->id,
                            'title' => $chat->title,
                            'updated_at' => $chat->updated_at->toISOString(),
                        ];
                    })->toArray(),
                    'widgets' => $workspace->widgets->map(function ($widget) {
                        return [
                            'id' => $widget->id,
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
                            ] : null,
                        ];
                    })->toArray(),
                ];
            });

        $topicNames = $topics->pluck('name')->toArray();
        $topicMap = $topics->pluck('id', 'name')->toArray();

        return Inertia::render('Workspaces/Index', [
            'initialWorkspaces' => $workspaces->values()->toArray(),
            'initialTopics' => $topicNames,
            'initialTopicMap' => $topicMap,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:100',
            'topic_id' => 'required|exists:topics,id',
        ]);

        $topic = $request->user()->topics()->find($validated['topic_id']);
        abort_unless($topic, 403);

        $workspace = $request->user()->workspaces()->create([
            'title' => $validated['title'],
            'topic_id' => $validated['topic_id'],
        ]);

        $workspace->load('topic');

        return response()->json([
            'id' => $workspace->id,
            'title' => $workspace->title,
            'topic' => $workspace->topic->name,
            'topic_id' => $workspace->topic_id,
            'chats' => [],
            'widgets' => [],
        ], 201);
    }

    public function update(Request $request, Workspace $workspace): JsonResponse
    {
        abort_unless($workspace->user_id === $request->user()->id, 403);

        $validated = $request->validate([
            'title' => 'required|string|max:100',
        ]);

        $workspace->update($validated);

        return response()->json($workspace);
    }

    public function destroy(Request $request, Workspace $workspace): JsonResponse
    {
        abort_unless($workspace->user_id === $request->user()->id, 403);

        $workspace->delete();

        return response()->json(null, 204);
    }
}
