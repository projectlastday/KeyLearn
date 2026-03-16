<?php

use App\Models\Topic;
use App\Models\User;
use App\Models\Widget;
use App\Models\WidgetTodoItem;
use App\Models\WidgetTodoStatus;
use App\Models\Workspace;

function createTodoWorkspace(User $user): Workspace
{
    $topic = Topic::create([
        'user_id' => $user->id,
        'name' => 'Produktivitas To-Do',
    ]);

    return Workspace::create([
        'user_id' => $user->id,
        'topic_id' => $topic->id,
        'title' => 'To-Do Workspace',
    ]);
}

function createTodoWidget(User $user, Workspace $workspace): Widget
{
    return Widget::create([
        'workspace_id' => $workspace->id,
        'created_by' => $user->id,
        'type' => 'todo',
        'title' => 'Daftar Tugas',
        'size_preset' => 'M',
        'grid_x' => 1,
        'grid_y' => 1,
        'grid_w' => 6,
        'grid_h' => 2,
        'sort_order' => 1,
    ]);
}

test('user can create todo widget and default statuses are seeded', function () {
    $user = User::factory()->create();
    $workspace = createTodoWorkspace($user);

    $response = $this->actingAs($user)->post('/api/widgets', [
        'workspace_id' => $workspace->id,
        'type' => 'todo',
        'title' => 'Checklist Harian',
        'size_preset' => 'M',
    ]);

    $response->assertCreated()
        ->assertJsonPath('type', 'todo');

    $widgetId = $response->json('id');
    $statusNames = collect($response->json('todo_statuses'))->pluck('name')->values()->all();

    expect($statusNames)->toBe(['belum', 'sedang dilakukan', 'selesai dilakukan']);
    $this->assertDatabaseHas('widget_todo_statuses', [
        'widget_id' => $widgetId,
        'name' => 'belum',
        'is_system' => true,
    ]);
});

test('user can add and update todo item in own todo widget', function () {
    $user = User::factory()->create();
    $workspace = createTodoWorkspace($user);

    $createResponse = $this->actingAs($user)->post('/api/widgets', [
        'workspace_id' => $workspace->id,
        'type' => 'todo',
        'title' => 'Checklist',
    ]);

    $widgetId = $createResponse->json('id');
    $statusBelum = collect($createResponse->json('todo_statuses'))->firstWhere('name', 'belum');
    $statusSedang = collect($createResponse->json('todo_statuses'))->firstWhere('name', 'sedang dilakukan');

    $storeResponse = $this->actingAs($user)->post("/api/widget-todos/{$widgetId}/items", [
        'content' => 'Kerjakan ringkasan bab 2',
        'status_id' => $statusBelum['id'],
    ]);

    $storeResponse->assertCreated()
        ->assertJsonPath('content', 'Kerjakan ringkasan bab 2')
        ->assertJsonPath('status_id', $statusBelum['id']);

    $itemId = $storeResponse->json('id');

    $this->actingAs($user)->put("/api/widget-todos/items/{$itemId}", [
        'content' => 'Kerjakan ringkasan bab 2 (revisi)',
        'status_id' => $statusSedang['id'],
    ])->assertOk()
        ->assertJsonPath('status_id', $statusSedang['id']);

    $this->assertDatabaseHas('widget_todo_items', [
        'id' => $itemId,
        'content' => 'Kerjakan ringkasan bab 2 (revisi)',
        'status_id' => $statusSedang['id'],
    ]);
});

test('user can create and delete custom todo status with reassignment', function () {
    $user = User::factory()->create();
    $workspace = createTodoWorkspace($user);

    $createResponse = $this->actingAs($user)->post('/api/widgets', [
        'workspace_id' => $workspace->id,
        'type' => 'todo',
        'title' => 'Checklist',
    ]);

    $widgetId = $createResponse->json('id');
    $statusBelum = collect($createResponse->json('todo_statuses'))->firstWhere('name', 'belum');

    $statusResponse = $this->actingAs($user)->post("/api/widget-todos/{$widgetId}/statuses", [
        'name' => 'Ditunda',
    ]);

    $statusResponse->assertCreated()->assertJsonPath('name', 'Ditunda');
    $customStatusId = $statusResponse->json('id');

    $itemResponse = $this->actingAs($user)->post("/api/widget-todos/{$widgetId}/items", [
        'content' => 'Tugas tertunda',
        'status_id' => $customStatusId,
    ]);

    $itemId = $itemResponse->json('id');

    $this->actingAs($user)->delete("/api/widget-todos/statuses/{$customStatusId}", [
        'target_status_id' => $statusBelum['id'],
    ])->assertOk();

    $this->assertDatabaseMissing('widget_todo_statuses', [
        'id' => $customStatusId,
    ]);
    $this->assertDatabaseHas('widget_todo_items', [
        'id' => $itemId,
        'status_id' => $statusBelum['id'],
    ]);
});

test('user can reorder todo items', function () {
    $user = User::factory()->create();
    $workspace = createTodoWorkspace($user);

    $createResponse = $this->actingAs($user)->post('/api/widgets', [
        'workspace_id' => $workspace->id,
        'type' => 'todo',
        'title' => 'Checklist',
    ]);

    $widgetId = $createResponse->json('id');
    $statusBelum = collect($createResponse->json('todo_statuses'))->firstWhere('name', 'belum');

    $first = $this->actingAs($user)->post("/api/widget-todos/{$widgetId}/items", [
        'content' => 'Item pertama',
        'status_id' => $statusBelum['id'],
    ])->json();

    $second = $this->actingAs($user)->post("/api/widget-todos/{$widgetId}/items", [
        'content' => 'Item kedua',
        'status_id' => $statusBelum['id'],
    ])->json();

    $this->actingAs($user)->post("/api/widget-todos/{$widgetId}/reorder", [
        'items' => [
            ['id' => $second['id'], 'sort_order' => 1],
            ['id' => $first['id'], 'sort_order' => 2],
        ],
    ])->assertOk();

    $this->assertDatabaseHas('widget_todo_items', [
        'id' => $second['id'],
        'sort_order' => 1,
    ]);
    $this->assertDatabaseHas('widget_todo_items', [
        'id' => $first['id'],
        'sort_order' => 2,
    ]);
});

test('todo endpoints reject non todo widgets', function () {
    $user = User::factory()->create();
    $workspace = createTodoWorkspace($user);

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

    $this->actingAs($user)->post("/api/widget-todos/{$widget->id}/items", [
        'content' => 'Tidak valid',
    ])->assertStatus(422);
});
