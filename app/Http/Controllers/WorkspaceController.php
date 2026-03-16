<?php

namespace App\Http\Controllers;

use App\Models\Workspace;
use App\Support\WidgetData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WorkspaceController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $requestedWorkspaceId = (int) $request->query('workspace');

        if ($requestedWorkspaceId > 0) {
            $openedWorkspace = $user->workspaces()
                ->where('id', $requestedWorkspaceId)
                ->first();

            if ($openedWorkspace) {
                $openedWorkspace->update(['last_opened_at' => now()]);
                $openedWorkspace->openEvents()->create([
                    'opened_at' => now(),
                ]);
            }
        }

        $topics = $user->topics()->orderBy('name')->get();

        $workspaces = $user->workspaces()
            ->with([
                'topic',
                'chatSessions' => function ($query) {
                    $query->orderBy('updated_at', 'desc')->limit(20);
                },
                'widgets' => function ($query) {
                    $query->with(['note', 'youtube', 'pdf', 'whiteboard', 'chatSession', 'reminders', 'todoStatuses', 'todoItems.status', 'timer'])->orderBy('sort_order');
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
                    'widgets' => $workspace->widgets->map(fn ($widget) => WidgetData::widget($widget))->toArray(),
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

    public function open(Request $request, Workspace $workspace): JsonResponse
    {
        abort_unless($workspace->user_id === $request->user()->id, 403);

        $workspace->update([
            'last_opened_at' => now(),
        ]);

        $workspace->openEvents()->create([
            'opened_at' => now(),
        ]);

        return response()->json(null, 204);
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
