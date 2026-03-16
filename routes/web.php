<?php

use App\Http\Controllers\ChatSessionController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\StatisticsController;
use App\Http\Controllers\TopicController;
use App\Http\Controllers\TrashController;
use App\Http\Controllers\WidgetController;
use App\Http\Controllers\WidgetNoteController;
use App\Http\Controllers\WidgetPdfController;
use App\Http\Controllers\WidgetReminderController;
use App\Http\Controllers\WidgetTimerController;
use App\Http\Controllers\WidgetTodoController;
use App\Http\Controllers\WidgetWhiteboardController;
use App\Http\Controllers\WidgetYoutubeController;
use App\Http\Controllers\WorkspaceController;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function (Request $request) {
    $recentFolders = [];

    if ($request->user()) {
        $recentFolders = Workspace::query()
            ->where('user_id', $request->user()->id)
            ->whereNotNull('last_opened_at')
            ->orderByDesc('last_opened_at')
            ->limit(3)
            ->with(['topic:id,name'])
            ->get()
            ->map(function ($workspace) {
                return [
                    'id' => $workspace->id,
                    'title' => $workspace->title,
                    'topic' => $workspace->topic?->name,
                    'opened_at' => $workspace->last_opened_at?->toISOString(),
                ];
            })
            ->toArray();
    }

    return Inertia::render('Welcome', [
        'recentFolders' => $recentFolders,
    ]);
});

Route::middleware(['auth', 'verified.phone'])->group(function () {
    Route::get('/statistik', [StatisticsController::class, 'index']);
    Route::get('/workspaces', [WorkspaceController::class, 'index']);
    Route::get('/workspaces/{workspace}/chat/{chatSession}', [ChatSessionController::class, 'show']);

    Route::post('/api/topics', [TopicController::class, 'store']);
    Route::get('/api/topics', [TopicController::class, 'index']);
    Route::put('/api/topics/{topic}', [TopicController::class, 'update']);
    Route::delete('/api/topics/{topic}', [TopicController::class, 'destroy']);

    Route::post('/api/workspaces', [WorkspaceController::class, 'store']);
    Route::put('/api/workspaces/{workspace}', [WorkspaceController::class, 'update']);
    Route::delete('/api/workspaces/{workspace}', [WorkspaceController::class, 'destroy']);
    Route::post('/api/workspaces/{workspace}/open', [WorkspaceController::class, 'open']);

    Route::post('/api/workspaces/{workspace}/chat', [ChatSessionController::class, 'store']);
    Route::put('/api/chat-sessions/{chatSession}', [ChatSessionController::class, 'update']);
    Route::delete('/api/chat-sessions/{chatSession}', [ChatSessionController::class, 'destroy']);

    Route::post('/api/chat/{chatSession}/message', [MessageController::class, 'store']);

    Route::post('/api/widgets', [WidgetController::class, 'store']);
    Route::put('/api/widgets/{widget}', [WidgetController::class, 'update']);
    Route::delete('/api/widgets/{widget}', [WidgetController::class, 'destroy']);
    Route::post('/api/widgets/reorder', [WidgetController::class, 'reorder']);
    Route::post('/api/widgets/resize', [WidgetController::class, 'resize']);
    Route::put('/api/widget-notes/{widget}', [WidgetNoteController::class, 'update']);
    Route::put('/api/widget-youtubes/{widget}', [WidgetYoutubeController::class, 'update']);
    Route::post('/api/widget-pdfs/{widget}/file', [WidgetPdfController::class, 'upload']);
    Route::get('/api/widget-pdfs/{widget}/file', [WidgetPdfController::class, 'showFile'])->name('widget-pdfs.file');
    Route::put('/api/widget-whiteboards/{widget}', [WidgetWhiteboardController::class, 'update']);
    Route::post('/api/widget-reminders/{widget}/items', [WidgetReminderController::class, 'store']);
    Route::put('/api/widget-reminders/items/{item}', [WidgetReminderController::class, 'update']);
    Route::delete('/api/widget-reminders/items/{item}', [WidgetReminderController::class, 'destroy']);
    Route::get('/api/reminders/due', [WidgetReminderController::class, 'due']);
    Route::post('/api/reminders/items/{item}/acknowledge', [WidgetReminderController::class, 'acknowledge']);
    Route::post('/api/widget-todos/{widget}/items', [WidgetTodoController::class, 'storeItem']);
    Route::put('/api/widget-todos/items/{item}', [WidgetTodoController::class, 'updateItem']);
    Route::delete('/api/widget-todos/items/{item}', [WidgetTodoController::class, 'destroyItem']);
    Route::post('/api/widget-todos/{widget}/reorder', [WidgetTodoController::class, 'reorderItems']);
    Route::post('/api/widget-todos/{widget}/statuses', [WidgetTodoController::class, 'storeStatus']);
    Route::put('/api/widget-todos/statuses/{status}', [WidgetTodoController::class, 'updateStatus']);
    Route::delete('/api/widget-todos/statuses/{status}', [WidgetTodoController::class, 'destroyStatus']);
    Route::post('/api/widget-timers/{widget}/run', [WidgetTimerController::class, 'run']);
    Route::post('/api/widget-timers/{widget}/stop', [WidgetTimerController::class, 'stop']);
    Route::post('/api/widget-timers/{widget}/reset', [WidgetTimerController::class, 'reset']);

    Route::get('/trash', [TrashController::class, 'index']);
    Route::post('/api/trash/topics/{id}/restore', [TrashController::class, 'restoreTopic']);
    Route::delete('/api/trash/topics/{id}/force', [TrashController::class, 'forceDeleteTopic']);
    Route::post('/api/trash/workspaces/{id}/restore', [TrashController::class, 'restoreWorkspace']);
    Route::delete('/api/trash/workspaces/{id}/force', [TrashController::class, 'forceDeleteWorkspace']);
    Route::post('/api/trash/chats/{id}/restore', [TrashController::class, 'restoreChat']);
    Route::delete('/api/trash/chats/{id}/force', [TrashController::class, 'forceDeleteChat']);
    Route::post('/api/trash/widgets/{id}/restore', [TrashController::class, 'restoreWidget']);
    Route::delete('/api/trash/widgets/{id}/force', [TrashController::class, 'forceDeleteWidget']);
    Route::delete('/api/trash/empty', [TrashController::class, 'empty']);

});

require __DIR__.'/auth.php';
