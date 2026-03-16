<?php

namespace App\Http\Controllers;

use App\Models\ChatSession;
use App\Models\Topic;
use App\Models\Widget;
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

        $widgets = Widget::onlyTrashed()
            ->where('type', '!=', 'chat')
            ->whereHas('workspace', fn ($q) => $q->withTrashed()->where('user_id', $user->id))
            ->with(['workspace' => fn ($q) => $q->withTrashed()])
            ->orderBy('deleted_at', 'desc')
            ->get()
            ->map(fn ($w) => [
                'id' => $w->id,
                'title' => $w->title,
                'workspace' => $w->workspace?->title ?? '-',
                'type' => $w->type,
                'deleted_at' => $w->deleted_at->toISOString(),
            ]);

        return Inertia::render('Trash/Index', [
            'trashedTopics' => $topics->toArray(),
            'trashedWorkspaces' => $workspaces->toArray(),
            'trashedChats' => $chats->toArray(),
            'trashedWidgets' => $widgets->toArray(),
        ]);
    }

    public function restoreTopic(Request $request, int $id): JsonResponse
    {
        $topic = $request->user()->topics()->onlyTrashed()->findOrFail($id);
        $restored = $this->restoreTopicTree($topic);

        return response()->json([
            'message' => 'Topik berhasil dipulihkan.',
            'restored' => $restored,
        ]);
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
        $restoredTopicIds = [];

        if ($workspace->topic && $workspace->topic->trashed()) {
            $workspace->topic->restore();
            $restoredTopicIds[] = $workspace->topic->id;
        }

        $restored = $this->restoreWorkspaceTree($workspace);
        $restored['topics'] = array_values(array_unique([
            ...($restored['topics'] ?? []),
            ...$restoredTopicIds,
        ]));

        return response()->json([
            'message' => 'Folder berhasil dipulihkan.',
            'restored' => $restored,
        ]);
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

    public function restoreWidget(Request $request, int $id): JsonResponse
    {
        $widget = Widget::onlyTrashed()->with('chatSession')->findOrFail($id);
        $workspace = Workspace::withTrashed()->find($widget->workspace_id);
        abort_unless($workspace && $workspace->user_id === $request->user()->id, 403);

        if ($workspace->trashed()) {
            $workspace->restore();
            if ($workspace->topic && $workspace->topic->trashed()) {
                $workspace->topic->restore();
            }
        }

        $widget->restore();
        if ($widget->type === 'chat' && $widget->chatSession && $widget->chatSession->trashed()) {
            $widget->chatSession->restore();
        }

        return response()->json(['message' => 'Widget berhasil dipulihkan.']);
    }

    public function forceDeleteWidget(Request $request, int $id): JsonResponse
    {
        $widget = Widget::onlyTrashed()->with('chatSession')->findOrFail($id);
        $workspace = Workspace::withTrashed()->find($widget->workspace_id);
        abort_unless($workspace && $workspace->user_id === $request->user()->id, 403);

        $widget->forceDelete();

        return response()->json(null, 204);
    }

    public function empty(Request $request): JsonResponse
    {
        $user = $request->user();

        $user->topics()->onlyTrashed()->get()->each->forceDelete();
        $user->workspaces()->onlyTrashed()->get()->each->forceDelete();

        ChatSession::onlyTrashed()
            ->whereHas('workspace', fn ($q) => $q->withTrashed()->where('user_id', $user->id))
            ->get()
            ->each
            ->forceDelete();

        Widget::onlyTrashed()
            ->whereHas('workspace', fn ($q) => $q->withTrashed()->where('user_id', $user->id))
            ->get()
            ->each
            ->forceDelete();

        return response()->json(['message' => 'Tong sampah berhasil dikosongkan.']);
    }

    private function restoreTopicTree(Topic $topic): array
    {
        $topic->restore();

        $restored = [
            'topics' => [$topic->id],
            'workspaces' => [],
            'widgets' => [],
            'chats' => [],
        ];

        $topic->workspaces()
            ->onlyTrashed()
            ->get()
            ->each(function (Workspace $workspace) use (&$restored) {
                $workspaceRestored = $this->restoreWorkspaceTree($workspace);
                $restored['workspaces'] = [...$restored['workspaces'], ...$workspaceRestored['workspaces']];
                $restored['widgets'] = [...$restored['widgets'], ...$workspaceRestored['widgets']];
                $restored['chats'] = [...$restored['chats'], ...$workspaceRestored['chats']];
            });

        return [
            'topics' => array_values(array_unique($restored['topics'])),
            'workspaces' => array_values(array_unique($restored['workspaces'])),
            'widgets' => array_values(array_unique($restored['widgets'])),
            'chats' => array_values(array_unique($restored['chats'])),
        ];
    }

    private function restoreWorkspaceTree(Workspace $workspace): array
    {
        if ($workspace->trashed()) {
            $workspace->restore();
        }

        $restoredWidgets = [];
        $restoredChats = [];

        $workspace->widgets()
            ->onlyTrashed()
            ->with('chatSession')
            ->get()
            ->each(function (Widget $widget) use (&$restoredWidgets, &$restoredChats) {
                $widget->restore();
                $restoredWidgets[] = $widget->id;

                if ($widget->type === 'chat' && $widget->chatSession && $widget->chatSession->trashed()) {
                    $widget->chatSession->restore();
                    $restoredChats[] = $widget->chatSession->id;
                }
            });

        $workspace->chatSessions()
            ->onlyTrashed()
            ->get()
            ->each(function (ChatSession $chat) use (&$restoredChats) {
                $chat->restore();
                $restoredChats[] = $chat->id;
            });

        return [
            'topics' => [],
            'workspaces' => [$workspace->id],
            'widgets' => array_values(array_unique($restoredWidgets)),
            'chats' => array_values(array_unique($restoredChats)),
        ];
    }
}
