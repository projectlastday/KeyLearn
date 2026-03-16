<?php

use App\Models\Topic;
use App\Models\User;
use App\Models\Widget;
use App\Models\WidgetTimerSession;
use App\Models\Workspace;

function createTimerWorkspace(User $user): Workspace
{
    $topic = Topic::create([
        'user_id' => $user->id,
        'name' => 'Timer Test',
    ]);

    return Workspace::create([
        'user_id' => $user->id,
        'topic_id' => $topic->id,
        'title' => 'Workspace Timer',
    ]);
}

test('user can create timer widget in own workspace', function () {
    $user = User::factory()->create();
    $workspace = createTimerWorkspace($user);

    $response = $this->actingAs($user)->post('/api/widgets', [
        'workspace_id' => $workspace->id,
        'type' => 'timer',
        'title' => 'Timer Belajar',
        'size_preset' => 'M',
    ]);

    $response->assertCreated()
        ->assertJsonPath('type', 'timer')
        ->assertJsonPath('timer.elapsed_seconds', 0)
        ->assertJsonPath('timer.is_running', false)
        ->assertJsonPath('timer.started_at', null);

    $this->assertDatabaseHas('widget_timers', [
        'widget_id' => $response->json('id'),
        'elapsed_seconds' => 0,
        'is_running' => false,
    ]);
});

test('user can run stop and reset timer widget', function () {
    $user = User::factory()->create();
    $workspace = createTimerWorkspace($user);
    $widget = Widget::create([
        'workspace_id' => $workspace->id,
        'created_by' => $user->id,
        'type' => 'timer',
        'title' => 'Timer',
        'size_preset' => 'M',
        'grid_x' => 1,
        'grid_y' => 1,
        'grid_w' => 6,
        'grid_h' => 2,
        'sort_order' => 1,
    ]);
    $widget->timer()->create([
        'elapsed_seconds' => 0,
        'is_running' => false,
        'started_at' => null,
    ]);

    $this->actingAs($user)
        ->post("/api/widget-timers/{$widget->id}/run")
        ->assertOk()
        ->assertJsonPath('is_running', true);

    $activeSession = WidgetTimerSession::where('widget_id', $widget->id)->first();
    expect($activeSession)->not->toBeNull();
    expect($activeSession->ended_at)->toBeNull();

    $this->travel(5)->seconds();

    $this->actingAs($user)
        ->post("/api/widget-timers/{$widget->id}/stop")
        ->assertOk()
        ->assertJsonPath('is_running', false)
        ->assertJsonPath('started_at', null);

    $timerAfterStop = $widget->timer()->first();
    expect($timerAfterStop)->not->toBeNull();
    expect($timerAfterStop->elapsed_seconds)->toBeGreaterThanOrEqual(5);
    expect(WidgetTimerSession::where('widget_id', $widget->id)->count())->toBe(1);
    expect(WidgetTimerSession::where('widget_id', $widget->id)->first()->ended_at)->not->toBeNull();

    $this->actingAs($user)
        ->post("/api/widget-timers/{$widget->id}/reset")
        ->assertOk()
        ->assertJsonPath('elapsed_seconds', 0)
        ->assertJsonPath('is_running', false)
        ->assertJsonPath('started_at', null);

    $this->assertDatabaseHas('widget_timers', [
        'widget_id' => $widget->id,
        'elapsed_seconds' => 0,
        'is_running' => false,
    ]);
});

test('reset closes active timer session before zeroing timer', function () {
    $user = User::factory()->create();
    $workspace = createTimerWorkspace($user);
    $widget = Widget::create([
        'workspace_id' => $workspace->id,
        'created_by' => $user->id,
        'type' => 'timer',
        'title' => 'Timer',
        'size_preset' => 'M',
        'grid_x' => 1,
        'grid_y' => 1,
        'grid_w' => 6,
        'grid_h' => 2,
        'sort_order' => 1,
    ]);
    $widget->timer()->create([
        'elapsed_seconds' => 0,
        'is_running' => false,
    ]);

    $this->actingAs($user)->post("/api/widget-timers/{$widget->id}/run")->assertOk();
    $this->travel(3)->seconds();
    $this->actingAs($user)->post("/api/widget-timers/{$widget->id}/reset")->assertOk();

    $session = WidgetTimerSession::where('widget_id', $widget->id)->first();
    expect($session)->not->toBeNull();
    expect($session->ended_at)->not->toBeNull();
});

test('timer endpoints reject non timer widgets', function () {
    $user = User::factory()->create();
    $workspace = createTimerWorkspace($user);
    $widget = Widget::create([
        'workspace_id' => $workspace->id,
        'created_by' => $user->id,
        'type' => 'note',
        'title' => 'Catatan',
        'size_preset' => 'M',
        'grid_x' => 1,
        'grid_y' => 1,
        'grid_w' => 6,
        'grid_h' => 2,
        'sort_order' => 1,
    ]);

    $this->actingAs($user)->post("/api/widget-timers/{$widget->id}/run")->assertStatus(422);
    $this->actingAs($user)->post("/api/widget-timers/{$widget->id}/stop")->assertStatus(422);
    $this->actingAs($user)->post("/api/widget-timers/{$widget->id}/reset")->assertStatus(422);
});

test('user cannot control timer widget owned by another user', function () {
    $owner = User::factory()->create();
    $attacker = User::factory()->create();
    $workspace = createTimerWorkspace($owner);
    $widget = Widget::create([
        'workspace_id' => $workspace->id,
        'created_by' => $owner->id,
        'type' => 'timer',
        'title' => 'Timer',
        'size_preset' => 'M',
        'grid_x' => 1,
        'grid_y' => 1,
        'grid_w' => 6,
        'grid_h' => 2,
        'sort_order' => 1,
    ]);
    $widget->timer()->create([
        'elapsed_seconds' => 0,
        'is_running' => false,
    ]);

    $this->actingAs($attacker)->post("/api/widget-timers/{$widget->id}/run")->assertForbidden();
});
