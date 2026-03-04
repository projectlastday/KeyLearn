<?php

namespace App\Http\Controllers;

use App\Models\ChatSession;
use App\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TrashController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $topics = $user->topics()->onlyTrashed()
            ->orderBy('deleted_at', 'desc')
            ->get()
            ->map(fn ($t) => [
                'id' => $t->id,
                'name' => $t->name,
                'type' => 'topic',
                'deleted_at' => $t->deleted_at->toISOString(),
            ]);

        $workspaces = $user->workspaces()->onlyTrashed()
            ->with(['topic' => fn ($q) => $q->withTrashed()])
            ->orderBy('deleted_at', 'desc')
            ->get()
            ->map(fn ($w) => [
                'id' => $w->id,
                'title' => $w->title,
                'topic' => $w->topic?->name ?? '-',
                'type' => 'workspace',
                'deleted_at' => $w->deleted_at->toISOString(),
            ]);

        $chats = ChatSession::onlyTrashed()
            ->whereHas('workspace', fn ($q) => $q->withTrashed()->where('user_id', $user->id))
            ->with(['workspace' => fn ($q) => $q->withTrashed()])
            ->orderBy('deleted_at', 'desc')
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'title' => $c->title,
                'workspace' => $c->workspace?->title ?? '-',
                'type' => 'chat',
                'deleted_at' => $c->deleted_at->toISOString(),
            ]);

        return Inertia::render('Trash/Index', [
            'trashedTopics' => $topics->toArray(),
            'trashedWorkspaces' => $workspaces->toArray(),
            'trashedChats' => $chats->toArray(),
        ]);
    }

    public function restoreTopic(Request $request, int $id): JsonResponse
    {
        $topic = $request->user()->topics()->onlyTrashed()->findOrFail($id);
        $topic->restore();

        return response()->json(['message' => 'Topik berhasil dipulihkan.']);
    }

    public function forceDeleteTopic(Request $request, int $id): JsonResponse
    {
        $topic = $request->user()->topics()->onlyTrashed()->findOrFail($id);
        $topic->forceDelete();

        return response()->json(null, 204);
    }

    public function restoreWorkspace(Request $request, int $id): JsonResponse
    {
        $workspace = $request->user()->workspaces()->onlyTrashed()->findOrFail($id);

        if ($workspace->topic && $workspace->topic->trashed()) {
            $workspace->topic->restore();
        }

        $workspace->restore();

        return response()->json(['message' => 'Folder berhasil dipulihkan.']);
    }

    public function forceDeleteWorkspace(Request $request, int $id): JsonResponse
    {
        $workspace = $request->user()->workspaces()->onlyTrashed()->findOrFail($id);
        $workspace->forceDelete();

        return response()->json(null, 204);
    }

    public function restoreChat(Request $request, int $id): JsonResponse
    {
        $chat = ChatSession::onlyTrashed()->findOrFail($id);
        $workspace = $chat->workspace;
        abort_unless($workspace && $workspace->user_id === $request->user()->id, 403);

        if ($workspace->trashed()) {
            $workspace->restore();
            if ($workspace->topic && $workspace->topic->trashed()) {
                $workspace->topic->restore();
            }
        }

        $chat->restore();

        return response()->json(['message' => 'Obrolan berhasil dipulihkan.']);
    }

    public function forceDeleteChat(Request $request, int $id): JsonResponse
    {
        $chat = ChatSession::onlyTrashed()->findOrFail($id);
        $workspace = Workspace::withTrashed()->find($chat->workspace_id);
        abort_unless($workspace && $workspace->user_id === $request->user()->id, 403);

        $chat->forceDelete();

        return response()->json(null, 204);
    }
}
