<?php

use App\Models\ChatSession;
use App\Models\Topic;
use App\Models\User;
use App\Models\Widget;
use App\Models\Workspace;

test('user can create note widget in own workspace', function () {
    $user = User::factory()->create();
    $topic = Topic::create([
        'user_id' => $user->id,
        'name' => 'Sains',
    ]);
    $workspace = Workspace::create([
        'user_id' => $user->id,
        'topic_id' => $topic->id,
        'title' => 'Fisika',
    ]);

    $response = $this->actingAs($user)->post('/api/widgets', [
        'workspace_id' => $workspace->id,
        'type' => 'note',
        'title' => 'Catatan Bab 1',
        'size_preset' => 'M',
    ]);

    $response->assertCreated();
    $this->assertDatabaseHas('widgets', [
        'workspace_id' => $workspace->id,
        'type' => 'note',
        'title' => 'Catatan Bab 1',
    ]);
    $this->assertDatabaseHas('widget_notes', [
        'widget_id' => $response->json('id'),
        'text_size' => 'normal',
    ]);
});

test('user can update note content and text size', function () {
    $user = User::factory()->create();
    $topic = Topic::create([
        'user_id' => $user->id,
        'name' => 'Matematika',
    ]);
    $workspace = Workspace::create([
        'user_id' => $user->id,
        'topic_id' => $topic->id,
        'title' => 'Aljabar',
    ]);

    $createResponse = $this->actingAs($user)->post('/api/widgets', [
        'workspace_id' => $workspace->id,
        'type' => 'note',
        'title' => 'Catatan',
    ]);

    $widgetId = $createResponse->json('id');

    $updateResponse = $this->actingAs($user)->put("/api/widget-notes/{$widgetId}", [
        'content' => 'Isi catatan penting',
        'text_size' => 'large',
    ]);

    $updateResponse->assertOk();
    expect($updateResponse->json('text_size'))->toBe('large');
    $this->assertDatabaseHas('widget_notes', [
        'widget_id' => $widgetId,
        'content' => 'Isi catatan penting',
        'text_size' => 'large',
    ]);
});

test('updating note with invalid text size returns validation error', function () {
    $user = User::factory()->create();
    $topic = Topic::create([
        'user_id' => $user->id,
        'name' => 'Bahasa Indonesia',
    ]);
    $workspace = Workspace::create([
        'user_id' => $user->id,
        'topic_id' => $topic->id,
        'title' => 'Ringkasan',
    ]);

    $createResponse = $this->actingAs($user)->post('/api/widgets', [
        'workspace_id' => $workspace->id,
        'type' => 'note',
        'title' => 'Catatan',
    ]);

    $widgetId = $createResponse->json('id');

    $this->actingAs($user)
        ->putJson("/api/widget-notes/{$widgetId}", [
            'text_size' => 'gigantic',
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['text_size']);
});

test('content-only note update preserves previous text size', function () {
    $user = User::factory()->create();
    $topic = Topic::create([
        'user_id' => $user->id,
        'name' => 'Kimia',
    ]);
    $workspace = Workspace::create([
        'user_id' => $user->id,
        'topic_id' => $topic->id,
        'title' => 'Reaksi',
    ]);

    $createResponse = $this->actingAs($user)->post('/api/widgets', [
        'workspace_id' => $workspace->id,
        'type' => 'note',
        'title' => 'Catatan',
    ]);
    $widgetId = $createResponse->json('id');

    $this->actingAs($user)->put("/api/widget-notes/{$widgetId}", [
        'content' => 'Versi awal',
        'text_size' => 'small',
    ])->assertOk();

    $response = $this->actingAs($user)->put("/api/widget-notes/{$widgetId}", [
        'content' => 'Versi baru',
    ]);

    $response->assertOk();
    expect($response->json('text_size'))->toBe('small');
    $this->assertDatabaseHas('widget_notes', [
        'widget_id' => $widgetId,
        'content' => 'Versi baru',
        'text_size' => 'small',
    ]);
});

test('user can create chat widget in own workspace', function () {
    $user = User::factory()->create();
    $topic = Topic::create([
        'user_id' => $user->id,
        'name' => 'Bahasa',
    ]);
    $workspace = Workspace::create([
        'user_id' => $user->id,
        'topic_id' => $topic->id,
        'title' => 'Diskusi',
    ]);

    $response = $this->actingAs($user)->post('/api/widgets', [
        'workspace_id' => $workspace->id,
        'type' => 'chat',
        'title' => 'Obrolan Ujian',
        'size_preset' => 'M',
    ]);

    $response->assertCreated();
    $widgetId = $response->json('id');
    $chatId = $response->json('chat_session_id');

    $this->assertDatabaseHas('widgets', [
        'id' => $widgetId,
        'workspace_id' => $workspace->id,
        'type' => 'chat',
        'title' => 'Obrolan Ujian',
        'chat_session_id' => $chatId,
    ]);
    $this->assertDatabaseHas('chat_sessions', [
        'id' => $chatId,
        'workspace_id' => $workspace->id,
        'title' => 'Obrolan Ujian',
    ]);
});

test('updating chat widget title also updates chat session title', function () {
    $user = User::factory()->create();
    $topic = Topic::create([
        'user_id' => $user->id,
        'name' => 'Kimia',
    ]);
    $workspace = Workspace::create([
        'user_id' => $user->id,
        'topic_id' => $topic->id,
        'title' => 'Latihan',
    ]);

    $createResponse = $this->actingAs($user)->post('/api/widgets', [
        'workspace_id' => $workspace->id,
        'type' => 'chat',
        'title' => 'Obrolan Lama',
    ]);

    $widgetId = $createResponse->json('id');
    $chatId = $createResponse->json('chat_session_id');

    $this->actingAs($user)->put("/api/widgets/{$widgetId}", [
        'title' => 'Obrolan Baru',
    ])->assertOk();

    $this->assertDatabaseHas('widgets', [
        'id' => $widgetId,
        'title' => 'Obrolan Baru',
    ]);
    $this->assertDatabaseHas('chat_sessions', [
        'id' => $chatId,
        'title' => 'Obrolan Baru',
    ]);
});

test('updating chat session title also updates linked widget title', function () {
    $user = User::factory()->create();
    $topic = Topic::create([
        'user_id' => $user->id,
        'name' => 'Sejarah',
    ]);
    $workspace = Workspace::create([
        'user_id' => $user->id,
        'topic_id' => $topic->id,
        'title' => 'Review',
    ]);

    $createResponse = $this->actingAs($user)->post('/api/widgets', [
        'workspace_id' => $workspace->id,
        'type' => 'chat',
        'title' => 'Sesi Awal',
    ]);
    $chatId = $createResponse->json('chat_session_id');

    $this->actingAs($user)->put("/api/chat-sessions/{$chatId}", [
        'title' => 'Sesi Final',
    ])->assertOk();

    $this->assertDatabaseHas('chat_sessions', [
        'id' => $chatId,
        'title' => 'Sesi Final',
    ]);
    $this->assertDatabaseHas('widgets', [
        'chat_session_id' => $chatId,
        'title' => 'Sesi Final',
    ]);
});

test('deleting chat widget soft deletes linked chat session', function () {
    $user = User::factory()->create();
    $topic = Topic::create([
        'user_id' => $user->id,
        'name' => 'Biologi',
    ]);
    $workspace = Workspace::create([
        'user_id' => $user->id,
        'topic_id' => $topic->id,
        'title' => 'Bab Sel',
    ]);

    $createResponse = $this->actingAs($user)->post('/api/widgets', [
        'workspace_id' => $workspace->id,
        'type' => 'chat',
        'title' => 'Diskusi Sel',
    ]);

    $widgetId = $createResponse->json('id');
    $chatId = $createResponse->json('chat_session_id');

    $this->actingAs($user)->delete("/api/widgets/{$widgetId}")
        ->assertNoContent();

    $widget = Widget::withTrashed()->findOrFail($widgetId);
    $chat = ChatSession::withTrashed()->findOrFail($chatId);
    expect($widget->trashed())->toBeTrue();
    expect($chat->trashed())->toBeTrue();
});
