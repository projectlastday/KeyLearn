<?php

use App\Models\ChatSession;
use App\Models\Message;
use App\Models\Topic;
use App\Models\User;
use App\Models\Widget;
use App\Models\WidgetTimerSession;
use App\Models\Workspace;
use App\Models\WorkspaceOpenEvent;
use Inertia\Testing\AssertableInertia as Assert;

function createStatisticsWorkspace(User $user, string $topicName = 'Statistik'): Workspace
{
    $topic = Topic::create([
        'user_id' => $user->id,
        'name' => $topicName,
    ]);

    return Workspace::create([
        'user_id' => $user->id,
        'topic_id' => $topic->id,
        'title' => 'Workspace Statistik',
    ]);
}

test('statistics page shows selected month summary metrics', function () {
    $this->travelTo(now('Asia/Jakarta')->setDate(2026, 3, 15)->setTime(9, 0, 0));

    $user = User::factory()->create([
        'created_at' => now('Asia/Jakarta')->setDate(2026, 1, 10)->setTime(8, 0, 0),
        'updated_at' => now('Asia/Jakarta')->setDate(2026, 1, 10)->setTime(8, 0, 0),
    ]);
    $workspace = createStatisticsWorkspace($user);

    $noteWidget = Widget::create([
        'workspace_id' => $workspace->id,
        'created_by' => $user->id,
        'type' => 'note',
        'title' => 'Catatan Maret',
        'size_preset' => 'M',
        'grid_x' => 1,
        'grid_y' => 1,
        'grid_w' => 6,
        'grid_h' => 2,
        'sort_order' => 1,
    ]);
    $noteWidget->forceFill([
        'created_at' => now('Asia/Jakarta')->setDate(2026, 3, 5)->setTime(10, 0, 0),
        'updated_at' => now('Asia/Jakarta')->setDate(2026, 3, 5)->setTime(10, 0, 0),
    ])->saveQuietly();

    $timerWidget = Widget::create([
        'workspace_id' => $workspace->id,
        'created_by' => $user->id,
        'type' => 'timer',
        'title' => 'Timer Maret',
        'size_preset' => 'M',
        'grid_x' => 1,
        'grid_y' => 2,
        'grid_w' => 6,
        'grid_h' => 2,
        'sort_order' => 2,
    ]);
    $timerWidget->forceFill([
        'created_at' => now('Asia/Jakarta')->setDate(2026, 3, 1)->setTime(8, 0, 0),
        'updated_at' => now('Asia/Jakarta')->setDate(2026, 3, 1)->setTime(8, 0, 0),
    ])->saveQuietly();
    $timerWidget->timer()->create([
        'elapsed_seconds' => 3600,
        'is_running' => false,
    ]);

    WorkspaceOpenEvent::create([
        'workspace_id' => $workspace->id,
        'opened_at' => now('Asia/Jakarta')->setDate(2026, 3, 2)->setTime(8, 0, 0),
    ]);
    WorkspaceOpenEvent::create([
        'workspace_id' => $workspace->id,
        'opened_at' => now('Asia/Jakarta')->setDate(2026, 3, 7)->setTime(9, 0, 0),
    ]);

    $chat = ChatSession::create([
        'workspace_id' => $workspace->id,
        'title' => 'Chat Statistik',
        'selected_ai_model' => 'gemini-2.5-flash',
    ]);

    $userMessageOne = Message::create([
        'chat_session_id' => $chat->id,
        'role' => 'user',
        'content' => 'Halo',
    ]);
    $userMessageOne->forceFill([
        'created_at' => now('Asia/Jakarta')->setDate(2026, 3, 3)->setTime(11, 0, 0),
        'updated_at' => now('Asia/Jakarta')->setDate(2026, 3, 3)->setTime(11, 0, 0),
    ])->saveQuietly();

    $assistantMessage = Message::create([
        'chat_session_id' => $chat->id,
        'role' => 'assistant',
        'content' => 'Hai',
    ]);
    $assistantMessage->forceFill([
        'created_at' => now('Asia/Jakarta')->setDate(2026, 3, 3)->setTime(11, 0, 5),
        'updated_at' => now('Asia/Jakarta')->setDate(2026, 3, 3)->setTime(11, 0, 5),
    ])->saveQuietly();

    $userMessageTwo = Message::create([
        'chat_session_id' => $chat->id,
        'role' => 'user',
        'content' => 'Lanjut',
    ]);
    $userMessageTwo->forceFill([
        'created_at' => now('Asia/Jakarta')->setDate(2026, 3, 8)->setTime(15, 30, 0),
        'updated_at' => now('Asia/Jakarta')->setDate(2026, 3, 8)->setTime(15, 30, 0),
    ])->saveQuietly();

    WidgetTimerSession::create([
        'widget_id' => $timerWidget->id,
        'started_at' => now('Asia/Jakarta')->setDate(2026, 2, 28)->setTime(23, 50, 0),
        'ended_at' => now('Asia/Jakarta')->setDate(2026, 3, 1)->setTime(0, 10, 0),
    ]);
    WidgetTimerSession::create([
        'widget_id' => $timerWidget->id,
        'started_at' => now('Asia/Jakarta')->setDate(2026, 3, 10)->setTime(12, 0, 0),
        'ended_at' => now('Asia/Jakarta')->setDate(2026, 3, 10)->setTime(12, 30, 0),
    ]);

    $this->actingAs($user)
        ->get('/statistik?month=2026-03')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Statistics/Index')
            ->where('selectedMonth', '2026-03')
            ->where('stats.totalTopics', 1)
            ->where('stats.totalWorkspaces', 1)
            ->where('stats.totalActiveWidgets', 2)
            ->where('stats.widgetsCreatedInMonth', 2)
            ->where('stats.userMessagesSentInMonth', 2)
            ->where('stats.timerDurationInMonthSeconds', 2400)
            ->where('stats.newTimersInMonth', 1)
            ->has('availableMonths', 3)
        );
});

test('workspace open endpoints write tracking events', function () {
    $user = User::factory()->create();
    $workspace = createStatisticsWorkspace($user, 'Riwayat');
    $chat = ChatSession::create([
        'workspace_id' => $workspace->id,
        'title' => 'Riwayat Chat',
        'selected_ai_model' => 'gemini-2.5-flash',
    ]);

    $this->actingAs($user)
        ->post("/api/workspaces/{$workspace->id}/open")
        ->assertNoContent();

    $this->actingAs($user)
        ->get("/workspaces/{$workspace->id}/chat/{$chat->id}")
        ->assertOk();

    expect(WorkspaceOpenEvent::where('workspace_id', $workspace->id)->count())->toBe(2);
});
