<?php

namespace App\Http\Controllers;

use App\Models\ChatSession;
use App\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ChatSessionController extends Controller
{
    public function show(Request $request, Workspace $workspace, ChatSession $chatSession): Response
    {
        abort_unless($workspace->user_id === $request->user()->id, 403);
        abort_unless($chatSession->workspace_id === $workspace->id, 404);

        // Mark this chat as recently opened for homepage "Obrolan terakhir".
        $chatSession->touch();

        $workspace->load('topic');

        $messages = $chatSession->messages()
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($msg) {
                return [
                    'id' => $msg->id,
                    'role' => $msg->role,
                    'content' => $msg->content,
                ];
            })
            ->toArray();

        $topicNames = $request->user()->topics()->orderBy('name')->pluck('name')->toArray();

        return Inertia::render('Workspaces/Chat/Index', [
            'workspace' => [
                'id' => $workspace->id,
                'title' => $workspace->title,
                'topic' => $workspace->topic ? $workspace->topic->name : null,
            ],
            'chat' => [
                'id' => $chatSession->id,
                'title' => $chatSession->title,
                'messages' => $messages,
            ],
            'allTopics' => $topicNames,
        ]);
    }

    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        abort_unless($workspace->user_id === $request->user()->id, 403);

        $chatSession = $workspace->chatSessions()->create([
            'title' => 'Obrolan Baru',
            'selected_ai_model' => 'gemini-2.5-flash',
        ]);

        return response()->json([
            'id' => $chatSession->id,
            'title' => $chatSession->title,
            'redirect_url' => '/workspaces/' . $workspace->id . '/chat/' . $chatSession->id,
        ], 201);
    }

    public function update(Request $request, ChatSession $chatSession): JsonResponse
    {
        $workspace = $chatSession->workspace;
        abort_unless($workspace->user_id === $request->user()->id, 403);

        $validated = $request->validate([
            'title' => 'required|string|max:100',
        ]);

        $chatSession->update($validated);

        return response()->json($chatSession);
    }

    public function destroy(Request $request, ChatSession $chatSession): JsonResponse
    {
        $workspace = $chatSession->workspace;
        abort_unless($workspace->user_id === $request->user()->id, 403);

        $chatSession->delete();

        return response()->json(null, 204);
    }
}
