<?php

use App\Models\ChatSession;
use App\Models\Topic;
use App\Models\User;
use App\Models\Widget;
use App\Models\Workspace;

function createWorkspaceTreeForTrash(User $user, string $topicName = 'Topik Uji', string $workspaceTitle = 'Folder Uji'): array
{
    $topic = Topic::create([
        'user_id' => $user->id,
        'name' => $topicName,
    ]);

    $workspace = Workspace::create([
        'user_id' => $user->id,
        'topic_id' => $topic->id,
        'title' => $workspaceTitle,
    ]);

    $noteWidget = Widget::create([
        'workspace_id' => $workspace->id,
        'created_by' => $user->id,
        'type' => 'note',
        'title' => 'Catatan Uji',
        'size_preset' => 'M',
        'grid_x' => 1,
        'grid_y' => 1,
        'grid_w' => 6,
        'grid_h' => 2,
        'sort_order' => 1,
    ]);

    $chat = ChatSession::create([
        'workspace_id' => $workspace->id,
        'title' => 'Obrolan Uji',
        'selected_ai_model' => 'gemini-2.5-flash',
    ]);

    $chatWidget = Widget::create([
        'workspace_id' => $workspace->id,
        'created_by' => $user->id,
        'chat_session_id' => $chat->id,
        'type' => 'chat',
        'title' => 'Widget Obrolan Uji',
        'size_preset' => 'M',
        'grid_x' => 1,
        'grid_y' => 2,
        'grid_w' => 6,
        'grid_h' => 2,
        'sort_order' => 2,
    ]);

    return [
        'topic' => $topic,
        'workspace' => $workspace,
        'noteWidget' => $noteWidget,
        'chat' => $chat,
        'chatWidget' => $chatWidget,
    ];
}

test('restoring a workspace restores its widgets and chats', function () {
    $user = User::factory()->create();
    $tree = createWorkspaceTreeForTrash($user);

    $tree['workspace']->delete();

    $this->assertSoftDeleted('workspaces', ['id' => $tree['workspace']->id]);
    $this->assertSoftDeleted('widgets', ['id' => $tree['noteWidget']->id]);
    $this->assertSoftDeleted('widgets', ['id' => $tree['chatWidget']->id]);
    $this->assertSoftDeleted('chat_sessions', ['id' => $tree['chat']->id]);

    $response = $this->actingAs($user)->post("/api/trash/workspaces/{$tree['workspace']->id}/restore");

    $response->assertOk()
        ->assertJsonPath('restored.workspaces.0', $tree['workspace']->id);

    expect($response->json('restored.widgets'))->toContain($tree['noteWidget']->id, $tree['chatWidget']->id);
    expect($response->json('restored.chats'))->toContain($tree['chat']->id);

    $this->assertDatabaseHas('workspaces', ['id' => $tree['workspace']->id, 'deleted_at' => null]);
    $this->assertDatabaseHas('widgets', ['id' => $tree['noteWidget']->id, 'deleted_at' => null]);
    $this->assertDatabaseHas('widgets', ['id' => $tree['chatWidget']->id, 'deleted_at' => null]);
    $this->assertDatabaseHas('chat_sessions', ['id' => $tree['chat']->id, 'deleted_at' => null]);
});

test('restoring a topic restores descendant workspaces widgets and chats', function () {
    $user = User::factory()->create();
    $tree = createWorkspaceTreeForTrash($user, 'Topik Trash', 'Folder Trash');

    $tree['topic']->delete();

    $this->assertSoftDeleted('topics', ['id' => $tree['topic']->id]);
    $this->assertSoftDeleted('workspaces', ['id' => $tree['workspace']->id]);
    $this->assertSoftDeleted('widgets', ['id' => $tree['noteWidget']->id]);
    $this->assertSoftDeleted('widgets', ['id' => $tree['chatWidget']->id]);
    $this->assertSoftDeleted('chat_sessions', ['id' => $tree['chat']->id]);

    $response = $this->actingAs($user)->post("/api/trash/topics/{$tree['topic']->id}/restore");

    $response->assertOk()
        ->assertJsonPath('restored.topics.0', $tree['topic']->id);

    expect($response->json('restored.workspaces'))->toContain($tree['workspace']->id);
    expect($response->json('restored.widgets'))->toContain($tree['noteWidget']->id, $tree['chatWidget']->id);
    expect($response->json('restored.chats'))->toContain($tree['chat']->id);

    $this->assertDatabaseHas('topics', ['id' => $tree['topic']->id, 'deleted_at' => null]);
    $this->assertDatabaseHas('workspaces', ['id' => $tree['workspace']->id, 'deleted_at' => null]);
    $this->assertDatabaseHas('widgets', ['id' => $tree['noteWidget']->id, 'deleted_at' => null]);
    $this->assertDatabaseHas('widgets', ['id' => $tree['chatWidget']->id, 'deleted_at' => null]);
    $this->assertDatabaseHas('chat_sessions', ['id' => $tree['chat']->id, 'deleted_at' => null]);
});

test('user can empty the entire trash in one action', function () {
    $user = User::factory()->create();
    $tree = createWorkspaceTreeForTrash($user, 'Topik Kosongkan', 'Folder Kosongkan');

    $tree['topic']->delete();

    $this->actingAs($user)
        ->delete('/api/trash/empty')
        ->assertOk()
        ->assertJsonPath('message', 'Tong sampah berhasil dikosongkan.');

    $this->assertDatabaseMissing('topics', ['id' => $tree['topic']->id]);
    $this->assertDatabaseMissing('workspaces', ['id' => $tree['workspace']->id]);
    $this->assertDatabaseMissing('widgets', ['id' => $tree['noteWidget']->id]);
    $this->assertDatabaseMissing('widgets', ['id' => $tree['chatWidget']->id]);
    $this->assertDatabaseMissing('chat_sessions', ['id' => $tree['chat']->id]);
});
