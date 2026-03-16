<?php

namespace App\Http\Controllers;

use App\Models\ChatSession;
use App\Models\Widget;
use App\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ChatSessionController extends Controller
{
    public function show(Request $request, Workspace $workspace, ChatSession $chatSession): Response
    {
        abort_unless($workspace->user_id === $request->user()->id, 403);
        abort_unless($chatSession->workspace_id === $workspace->id, 404);

        // Mark this chat as recently opened.
        $chatSession->touch();
        // Track the last opened folder for homepage "Folder terakhir".
        $workspace->update([
            'last_opened_at' => now(),
        ]);
        $workspace->openEvents()->create([
            'opened_at' => now(),
        ]);

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

        $title = 'Obrolan Baru';
        $nextSort = (int) $workspace->widgets()->max('sort_order') + 1;
        $chatSession = DB::transaction(function () use ($request, $workspace, $title, $nextSort) {
            $chat = $workspace->chatSessions()->create([
                'title' => $title,
                'selected_ai_model' => 'gemini-2.5-flash',
            ]);

            $workspace->widgets()->create([
                'created_by' => $request->user()->id,
                'chat_session_id' => $chat->id,
                'type' => 'chat',
                'title' => $title,
                'size_preset' => 'M',
                'grid_x' => 1,
                'grid_y' => $nextSort,
                'grid_w' => 6,
                'grid_h' => 2,
                'sort_order' => $nextSort,
            ]);

            return $chat;
        });

        return response()->json([
            'id' => $chatSession->id,
            'title' => $chatSession->title,
            'redirect_url' => '/workspaces/'.$workspace->id.'/chat/'.$chatSession->id,
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
        if ($chatSession->widget) {
            $chatSession->widget->update([
                'title' => $validated['title'],
            ]);
        }

        return response()->json($chatSession);
    }

    public function destroy(Request $request, ChatSession $chatSession): JsonResponse
    {
        $workspace = $chatSession->workspace;
        abort_unless($workspace->user_id === $request->user()->id, 403);

        DB::transaction(function () use ($chatSession) {
            Widget::where('chat_session_id', $chatSession->id)->get()->each->delete();
            $chatSession->delete();
        });

        return response()->json(null, 204);
    }
}
