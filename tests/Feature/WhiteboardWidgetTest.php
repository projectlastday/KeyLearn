<?php

use App\Models\Topic;
use App\Models\User;
use App\Models\Widget;
use App\Models\WidgetWhiteboard;
use App\Models\Workspace;

function createWhiteboardWorkspace(User $user): Workspace
{
    $topic = Topic::create([
        'user_id' => $user->id,
        'name' => 'Whiteboard',
    ]);

    return Workspace::create([
        'user_id' => $user->id,
        'topic_id' => $topic->id,
        'title' => 'Papan Tulis',
    ]);
}

test('user can create whiteboard widget in own workspace', function () {
    $user = User::factory()->create();
    $workspace = createWhiteboardWorkspace($user);

    $response = $this->actingAs($user)->post('/api/widgets', [
        'workspace_id' => $workspace->id,
        'type' => 'whiteboard',
        'title' => 'Whiteboard Ujian',
        'size_preset' => 'M',
    ]);

    $response->assertCreated()
        ->assertJsonPath('type', 'whiteboard')
        ->assertJsonPath('title', 'Whiteboard Ujian')
        ->assertJsonPath('whiteboard.strokes', []);

    $widgetId = $response->json('id');
    $this->assertDatabaseHas('widget_whiteboards', [
        'widget_id' => $widgetId,
    ]);
});

test('user can update whiteboard strokes in own whiteboard widget', function () {
    $user = User::factory()->create();
    $workspace = createWhiteboardWorkspace($user);

    $createResponse = $this->actingAs($user)->post('/api/widgets', [
        'workspace_id' => $workspace->id,
        'type' => 'whiteboard',
        'title' => 'Latihan Gambar',
    ]);

    $widgetId = $createResponse->json('id');

    $strokes = [
        [
            'tool' => 'pen',
            'color' => 'red',
            'size' => 'M',
            'points' => [
                ['x' => 0.1, 'y' => 0.1],
                ['x' => 0.4, 'y' => 0.2],
            ],
        ],
        [
            'tool' => 'eraser',
            'color' => null,
            'size' => 'S',
            'points' => [
                ['x' => 0.2, 'y' => 0.2],
                ['x' => 0.25, 'y' => 0.25],
            ],
        ],
    ];

    $this->actingAs($user)->put("/api/widget-whiteboards/{$widgetId}", [
        'strokes' => $strokes,
    ])->assertOk()
        ->assertJsonPath('whiteboard.strokes.0.color', 'red')
        ->assertJsonPath('whiteboard.strokes.1.tool', 'eraser');

    $whiteboard = WidgetWhiteboard::where('widget_id', $widgetId)->firstOrFail();
    expect($whiteboard->strokes)->toBe($strokes);
});

test('user can clear whiteboard strokes with empty array payload', function () {
    $user = User::factory()->create();
    $workspace = createWhiteboardWorkspace($user);

    $createResponse = $this->actingAs($user)->post('/api/widgets', [
        'workspace_id' => $workspace->id,
        'type' => 'whiteboard',
        'title' => 'Latihan Clear',
    ]);

    $widgetId = $createResponse->json('id');

    $this->actingAs($user)->put("/api/widget-whiteboards/{$widgetId}", [
        'strokes' => [],
    ])->assertOk()
        ->assertJsonPath('whiteboard.strokes', []);

    $whiteboard = WidgetWhiteboard::where('widget_id', $widgetId)->firstOrFail();
    expect($whiteboard->strokes)->toBe([]);
});

test('whiteboard endpoint rejects non whiteboard widgets', function () {
    $user = User::factory()->create();
    $workspace = createWhiteboardWorkspace($user);

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

    $this->actingAs($user)->put("/api/widget-whiteboards/{$widget->id}", [
        'strokes' => [],
    ])->assertStatus(422);
});

test('whiteboard endpoint blocks access from another user', function () {
    $owner = User::factory()->create();
    $workspace = createWhiteboardWorkspace($owner);
    $otherUser = User::factory()->create();

    $createResponse = $this->actingAs($owner)->post('/api/widgets', [
        'workspace_id' => $workspace->id,
        'type' => 'whiteboard',
        'title' => 'Private Board',
    ]);

    $widgetId = $createResponse->json('id');

    $this->actingAs($otherUser)->put("/api/widget-whiteboards/{$widgetId}", [
        'strokes' => [],
    ])->assertStatus(403);
});
