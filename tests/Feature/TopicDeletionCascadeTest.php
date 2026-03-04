<?php

use App\Models\ChatSession;
use App\Models\Topic;
use App\Models\User;
use App\Models\Widget;
use App\Models\Workspace;

test('deleting a topic soft deletes its workspaces and chats', function () {
    $user = User::factory()->create();
    $topic = Topic::create([
        'user_id' => $user->id,
        'name' => 'Math',
    ]);

    $workspace = Workspace::create([
        'user_id' => $user->id,
        'topic_id' => $topic->id,
        'title' => 'Algebra',
    ]);

    $chat = ChatSession::create([
        'workspace_id' => $workspace->id,
        'title' => 'Session 1',
    ]);

    $response = $this->actingAs($user)->delete("/api/topics/{$topic->id}");

    $response->assertNoContent();
    $this->assertSoftDeleted('topics', ['id' => $topic->id]);
    $this->assertSoftDeleted('workspaces', ['id' => $workspace->id]);
    $this->assertSoftDeleted('chat_sessions', ['id' => $chat->id]);
});

test('deleting a workspace soft deletes its chats', function () {
    $user = User::factory()->create();
    $topic = Topic::create([
        'user_id' => $user->id,
        'name' => 'Science',
    ]);

    $workspace = Workspace::create([
        'user_id' => $user->id,
        'topic_id' => $topic->id,
        'title' => 'Physics',
    ]);

    $chat = ChatSession::create([
        'workspace_id' => $workspace->id,
        'title' => 'Session 2',
    ]);

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

    $response = $this->actingAs($user)->delete("/api/workspaces/{$workspace->id}");

    $response->assertNoContent();
    $this->assertSoftDeleted('workspaces', ['id' => $workspace->id]);
    $this->assertSoftDeleted('chat_sessions', ['id' => $chat->id]);
    $this->assertSoftDeleted('widgets', ['id' => $widget->id]);
});
