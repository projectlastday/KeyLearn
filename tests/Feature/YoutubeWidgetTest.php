<?php

use App\Models\Topic;
use App\Models\User;
use App\Models\Widget;
use App\Models\Workspace;

function createYoutubeWorkspace(User $user): Workspace
{
    $topic = Topic::create([
        'user_id' => $user->id,
        'name' => 'Video',
    ]);

    return Workspace::create([
        'user_id' => $user->id,
        'topic_id' => $topic->id,
        'title' => 'Materi Video',
    ]);
}

test('user can create youtube widget in own workspace', function () {
    $user = User::factory()->create();
    $workspace = createYoutubeWorkspace($user);

    $response = $this->actingAs($user)->post('/api/widgets', [
        'workspace_id' => $workspace->id,
        'type' => 'youtube',
        'title' => 'Video Aljabar',
    ]);

    $response->assertCreated()
        ->assertJsonPath('type', 'youtube')
        ->assertJsonPath('youtube', null);

    $this->assertDatabaseHas('widgets', [
        'workspace_id' => $workspace->id,
        'type' => 'youtube',
        'title' => 'Video Aljabar',
    ]);
});

test('user can set youtube link using watch youtu be and shorts urls', function () {
    $user = User::factory()->create();
    $workspace = createYoutubeWorkspace($user);

    $widget = Widget::create([
        'workspace_id' => $workspace->id,
        'created_by' => $user->id,
        'type' => 'youtube',
        'title' => 'Video Geometri',
        'size_preset' => 'M',
        'grid_x' => 1,
        'grid_y' => 1,
        'grid_w' => 6,
        'grid_h' => 2,
        'sort_order' => 1,
    ]);

    $links = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ' => 'dQw4w9WgXcQ',
        'https://youtu.be/jNQXAC9IVRw' => 'jNQXAC9IVRw',
        'https://www.youtube.com/shorts/aqz-KE-bpKQ' => 'aqz-KE-bpKQ',
    ];

    foreach ($links as $link => $videoId) {
        $this->actingAs($user)
            ->put("/api/widget-youtubes/{$widget->id}", [
                'url' => $link,
            ])
            ->assertOk()
            ->assertJsonPath('youtube.video_id', $videoId)
            ->assertJsonPath('youtube.source_url', "https://www.youtube.com/watch?v={$videoId}")
            ->assertJsonPath('youtube.embed_url', "https://www.youtube-nocookie.com/embed/{$videoId}?rel=0&modestbranding=1");

        $this->assertDatabaseHas('widget_youtubes', [
            'widget_id' => $widget->id,
            'video_id' => $videoId,
            'source_url' => "https://www.youtube.com/watch?v={$videoId}",
        ]);
    }
});

test('youtube endpoint rejects invalid url and non youtube widget', function () {
    $user = User::factory()->create();
    $workspace = createYoutubeWorkspace($user);

    $youtubeWidget = Widget::create([
        'workspace_id' => $workspace->id,
        'created_by' => $user->id,
        'type' => 'youtube',
        'title' => 'Video Trigonometri',
        'size_preset' => 'M',
        'grid_x' => 1,
        'grid_y' => 1,
        'grid_w' => 6,
        'grid_h' => 2,
        'sort_order' => 1,
    ]);

    $this->actingAs($user)
        ->put("/api/widget-youtubes/{$youtubeWidget->id}", [
            'url' => 'https://example.com/video',
        ])
        ->assertStatus(422)
        ->assertJsonPath('message', 'Link YouTube tidak valid. Gunakan format watch, youtu.be, atau shorts.');

    $noteWidget = Widget::create([
        'workspace_id' => $workspace->id,
        'created_by' => $user->id,
        'type' => 'note',
        'title' => 'Bukan Youtube',
        'size_preset' => 'M',
        'grid_x' => 1,
        'grid_y' => 2,
        'grid_w' => 6,
        'grid_h' => 2,
        'sort_order' => 2,
    ]);

    $this->actingAs($user)
        ->put("/api/widget-youtubes/{$noteWidget->id}", [
            'url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        ])
        ->assertStatus(422)
        ->assertJsonPath('message', 'Widget ini bukan tipe YouTube.');
});

test('youtube endpoint blocks access from another user', function () {
    $owner = User::factory()->create();
    $workspace = createYoutubeWorkspace($owner);

    $widget = Widget::create([
        'workspace_id' => $workspace->id,
        'created_by' => $owner->id,
        'type' => 'youtube',
        'title' => 'Private Video',
        'size_preset' => 'M',
        'grid_x' => 1,
        'grid_y' => 1,
        'grid_w' => 6,
        'grid_h' => 2,
        'sort_order' => 1,
    ]);

    $attacker = User::factory()->create();

    $this->actingAs($attacker)
        ->put("/api/widget-youtubes/{$widget->id}", [
            'url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        ])
        ->assertForbidden();
});
