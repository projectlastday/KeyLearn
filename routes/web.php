<?php

use App\Http\Controllers\ChatSessionController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\TopicController;
use App\Http\Controllers\TrashController;
use App\Http\Controllers\WorkspaceController;
use App\Models\ChatSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function (Request $request) {
    $recentChats = [];

    if ($request->user()) {
        $recentChats = ChatSession::query()
            ->whereHas('workspace', function ($query) use ($request) {
                $query->where('user_id', $request->user()->id);
            })
            ->with(['workspace:id,title'])
            ->orderByDesc('updated_at')
            ->limit(3)
            ->get()
            ->map(function ($chat) {
                return [
                    'id' => $chat->id,
                    'title' => $chat->title,
                    'workspace_id' => $chat->workspace_id,
                    'workspace_title' => $chat->workspace?->title,
                    'updated_at' => $chat->updated_at?->toISOString(),
                ];
            })
            ->toArray();
    }

    return Inertia::render('Welcome', [
        'recentChats' => $recentChats,
    ]);
});

Route::middleware('auth')->group(function () {
    Route::get('/workspaces', [WorkspaceController::class, 'index']);
    Route::get('/workspaces/{workspace}/chat/{chatSession}', [ChatSessionController::class, 'show']);

    Route::post('/api/topics', [TopicController::class, 'store']);
    Route::get('/api/topics', [TopicController::class, 'index']);
    Route::put('/api/topics/{topic}', [TopicController::class, 'update']);
    Route::delete('/api/topics/{topic}', [TopicController::class, 'destroy']);

    Route::post('/api/workspaces', [WorkspaceController::class, 'store']);
    Route::put('/api/workspaces/{workspace}', [WorkspaceController::class, 'update']);
    Route::delete('/api/workspaces/{workspace}', [WorkspaceController::class, 'destroy']);

    Route::post('/api/workspaces/{workspace}/chat', [ChatSessionController::class, 'store']);
    Route::put('/api/chat-sessions/{chatSession}', [ChatSessionController::class, 'update']);
    Route::delete('/api/chat-sessions/{chatSession}', [ChatSessionController::class, 'destroy']);

    Route::post('/api/chat/{chatSession}/message', [MessageController::class, 'store']);

    Route::get('/trash', [TrashController::class, 'index']);
    Route::post('/api/trash/topics/{id}/restore', [TrashController::class, 'restoreTopic']);
    Route::delete('/api/trash/topics/{id}/force', [TrashController::class, 'forceDeleteTopic']);
    Route::post('/api/trash/workspaces/{id}/restore', [TrashController::class, 'restoreWorkspace']);
    Route::delete('/api/trash/workspaces/{id}/force', [TrashController::class, 'forceDeleteWorkspace']);
    Route::post('/api/trash/chats/{id}/restore', [TrashController::class, 'restoreChat']);
    Route::delete('/api/trash/chats/{id}/force', [TrashController::class, 'forceDeleteChat']);

});

require __DIR__.'/auth.php';
