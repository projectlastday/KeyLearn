<?php

use App\Models\Topic;
use App\Models\User;
use App\Models\Widget;
use App\Models\WidgetReminder;
use App\Models\Workspace;
use App\Services\FonnteClient;

function createReminderWorkspace(User $user): Workspace
{
    $topic = Topic::create([
        'user_id' => $user->id,
        'name' => 'Produktivitas',
    ]);

    return Workspace::create([
        'user_id' => $user->id,
        'topic_id' => $topic->id,
        'title' => 'Jadwal Belajar',
    ]);
}

function createReminderWidget(User $user, Workspace $workspace): Widget
{
    return Widget::create([
        'workspace_id' => $workspace->id,
        'created_by' => $user->id,
        'type' => 'reminder',
        'title' => 'Pengingat Belajar',
        'size_preset' => 'M',
        'grid_x' => 1,
        'grid_y' => 1,
        'grid_w' => 6,
        'grid_h' => 2,
        'sort_order' => 1,
    ]);
}

test('user can create reminder widget in own workspace', function () {
    $user = User::factory()->create();
    $workspace = createReminderWorkspace($user);

    $response = $this->actingAs($user)->post('/api/widgets', [
        'workspace_id' => $workspace->id,
        'type' => 'reminder',
        'title' => 'Pengingat Ujian',
        'size_preset' => 'M',
    ]);

    $response->assertCreated()
        ->assertJsonPath('type', 'reminder')
        ->assertJsonPath('title', 'Pengingat Ujian')
        ->assertJsonPath('reminders', []);
});

test('user can add reminder item to own reminder widget', function () {
    $user = User::factory()->create();
    $workspace = createReminderWorkspace($user);
    $widget = createReminderWidget($user, $workspace);
    $remindAt = now('Asia/Jakarta')->addHour();

    $response = $this->actingAs($user)->post("/api/widget-reminders/{$widget->id}/items", [
        'message' => 'Belajar integral',
        'remind_date' => $remindAt->format('Y-m-d'),
        'remind_time' => $remindAt->format('H:i'),
        'send_whatsapp' => true,
    ]);

    $response->assertCreated()
        ->assertJsonPath('message', 'Belajar integral')
        ->assertJsonPath('send_whatsapp', true);

    $this->assertDatabaseHas('widget_reminders', [
        'widget_id' => $widget->id,
        'message' => 'Belajar integral',
        'send_whatsapp' => true,
    ]);
});

test('user cannot add more than one reminder item in the same reminder widget', function () {
    $user = User::factory()->create();
    $workspace = createReminderWorkspace($user);
    $widget = createReminderWidget($user, $workspace);
    $first = now('Asia/Jakarta')->addHour();
    $second = now('Asia/Jakarta')->addHours(2);

    $this->actingAs($user)->post("/api/widget-reminders/{$widget->id}/items", [
        'message' => 'Pengingat pertama',
        'remind_date' => $first->format('Y-m-d'),
        'remind_time' => $first->format('H:i:s'),
        'send_whatsapp' => false,
    ])->assertCreated();

    $this->actingAs($user)->post("/api/widget-reminders/{$widget->id}/items", [
        'message' => 'Pengingat kedua',
        'remind_date' => $second->format('Y-m-d'),
        'remind_time' => $second->format('H:i:s'),
        'send_whatsapp' => false,
    ])->assertStatus(422)
        ->assertJsonPath('message', 'Widget ini hanya mendukung 1 pengingat.');
});

test('reminder endpoints reject non reminder widgets', function () {
    $user = User::factory()->create();
    $workspace = createReminderWorkspace($user);

    $response = $this->actingAs($user)->post('/api/widgets', [
        'workspace_id' => $workspace->id,
        'type' => 'note',
        'title' => 'Catatan',
        'size_preset' => 'M',
    ]);

    $widgetId = $response->json('id');
    $remindAt = now('Asia/Jakarta')->addHour();

    $this->actingAs($user)->post("/api/widget-reminders/{$widgetId}/items", [
        'message' => 'Tidak boleh',
        'remind_date' => $remindAt->format('Y-m-d'),
        'remind_time' => $remindAt->format('H:i'),
        'send_whatsapp' => false,
    ])->assertStatus(422);
});

test('triggered reminder item can be rescheduled and state is reset', function () {
    $user = User::factory()->create();
    $workspace = createReminderWorkspace($user);
    $widget = createReminderWidget($user, $workspace);

    $item = WidgetReminder::create([
        'widget_id' => $widget->id,
        'message' => 'Pengingat lama',
        'remind_at' => now('Asia/Jakarta')->subMinute(),
        'timezone' => 'Asia/Jakarta',
        'send_whatsapp' => true,
        'triggered_at' => now('Asia/Jakarta'),
        'in_app_seen_at' => now('Asia/Jakarta'),
        'whatsapp_sent_at' => now('Asia/Jakarta'),
        'whatsapp_attempt_count' => 2,
        'last_whatsapp_attempt_at' => now('Asia/Jakarta'),
        'whatsapp_last_error' => 'Gagal lama',
    ]);

    $future = now('Asia/Jakarta')->addDay();

    $this->actingAs($user)->put("/api/widget-reminders/items/{$item->id}", [
        'message' => 'Jadwal ulang',
        'remind_date' => $future->format('Y-m-d'),
        'remind_time' => $future->format('H:i'),
        'send_whatsapp' => false,
    ])->assertOk()
        ->assertJsonPath('message', 'Jadwal ulang')
        ->assertJsonPath('send_whatsapp', false);

    $item = $item->fresh();
    expect($item->triggered_at)->toBeNull();
    expect($item->in_app_seen_at)->toBeNull();
    expect($item->whatsapp_sent_at)->toBeNull();
    expect($item->whatsapp_attempt_count)->toBe(0);
    expect($item->last_whatsapp_attempt_at)->toBeNull();
    expect($item->whatsapp_last_error)->toBeNull();
});

test('due reminders endpoint only returns unseen reminders for current user', function () {
    $user = User::factory()->create();
    $workspace = createReminderWorkspace($user);
    $widget = createReminderWidget($user, $workspace);
    $otherUser = User::factory()->create();
    $otherWorkspace = createReminderWorkspace($otherUser);
    $otherWidget = createReminderWidget($otherUser, $otherWorkspace);

    $visible = WidgetReminder::create([
        'widget_id' => $widget->id,
        'message' => 'Muncul di popup',
        'remind_at' => now('Asia/Jakarta')->subMinute(),
        'timezone' => 'Asia/Jakarta',
        'send_whatsapp' => false,
        'triggered_at' => now('Asia/Jakarta')->subMinute(),
    ]);

    WidgetReminder::create([
        'widget_id' => $widget->id,
        'message' => 'Sudah dilihat',
        'remind_at' => now('Asia/Jakarta')->subMinute(),
        'timezone' => 'Asia/Jakarta',
        'send_whatsapp' => false,
        'triggered_at' => now('Asia/Jakarta')->subMinute(),
        'in_app_seen_at' => now('Asia/Jakarta'),
    ]);

    WidgetReminder::create([
        'widget_id' => $otherWidget->id,
        'message' => 'Punya user lain',
        'remind_at' => now('Asia/Jakarta')->subMinute(),
        'timezone' => 'Asia/Jakarta',
        'send_whatsapp' => false,
        'triggered_at' => now('Asia/Jakarta')->subMinute(),
    ]);

    $response = $this->actingAs($user)->get('/api/reminders/due');

    $response->assertOk();
    expect($response->json())->toHaveCount(1);
    expect($response->json('0.id'))->toBe($visible->id);
});

test('due reminders endpoint auto-triggers overdue untriggered reminder', function () {
    $user = User::factory()->create();
    $workspace = createReminderWorkspace($user);
    $widget = createReminderWidget($user, $workspace);

    $item = WidgetReminder::create([
        'widget_id' => $widget->id,
        'message' => 'Belum diproses command',
        'remind_at' => now('Asia/Jakarta')->subMinute(),
        'timezone' => 'Asia/Jakarta',
        'send_whatsapp' => false,
        'triggered_at' => null,
    ]);

    $response = $this->actingAs($user)->get('/api/reminders/due');

    $response->assertOk();
    expect($response->json())->toHaveCount(1);
    expect($response->json('0.id'))->toBe($item->id);
    expect($item->fresh()->triggered_at)->not->toBeNull();
});

test('due reminders endpoint also processes whatsapp delivery fallback', function () {
    $user = User::factory()->create();
    $workspace = createReminderWorkspace($user);
    $widget = createReminderWidget($user, $workspace);

    $item = WidgetReminder::create([
        'widget_id' => $widget->id,
        'message' => 'Kirim WA fallback',
        'remind_at' => now('Asia/Jakarta')->subMinute(),
        'timezone' => 'Asia/Jakarta',
        'send_whatsapp' => true,
        'triggered_at' => null,
    ]);

    $this->actingAs($user)->get('/api/reminders/due')->assertOk();

    $item = $item->fresh();
    expect($item->triggered_at)->not->toBeNull();
    expect($item->whatsapp_sent_at)->not->toBeNull();
});

test('user can acknowledge due reminder', function () {
    $user = User::factory()->create();
    $workspace = createReminderWorkspace($user);
    $widget = createReminderWidget($user, $workspace);

    $item = WidgetReminder::create([
        'widget_id' => $widget->id,
        'message' => 'Lihat popup',
        'remind_at' => now('Asia/Jakarta')->subMinute(),
        'timezone' => 'Asia/Jakarta',
        'send_whatsapp' => false,
        'triggered_at' => now('Asia/Jakarta')->subMinute(),
    ]);

    $this->actingAs($user)
        ->post("/api/reminders/items/{$item->id}/acknowledge")
        ->assertOk();

    expect($item->fresh()->in_app_seen_at)->not->toBeNull();
});

test('due reminder command triggers reminders and marks whatsapp as sent in testing', function () {
    $user = User::factory()->create();
    $workspace = createReminderWorkspace($user);
    $widget = createReminderWidget($user, $workspace);

    $item = WidgetReminder::create([
        'widget_id' => $widget->id,
        'message' => 'Kirim WA',
        'remind_at' => now('Asia/Jakarta')->subMinute(),
        'timezone' => 'Asia/Jakarta',
        'send_whatsapp' => true,
    ]);

    $this->artisan('app:process-due-reminders')
        ->assertExitCode(0);

    $item = $item->fresh();
    expect($item->triggered_at)->not->toBeNull();
    expect($item->whatsapp_sent_at)->not->toBeNull();
});

test('due reminder command records whatsapp failure and retry metadata', function () {
    $user = User::factory()->create();
    $workspace = createReminderWorkspace($user);
    $widget = createReminderWidget($user, $workspace);

    $item = WidgetReminder::create([
        'widget_id' => $widget->id,
        'message' => 'WA gagal',
        'remind_at' => now('Asia/Jakarta')->subMinute(),
        'timezone' => 'Asia/Jakarta',
        'send_whatsapp' => true,
    ]);

    app()->instance(FonnteClient::class, new class extends FonnteClient
    {
        public function sendMessage(string $phone, string $message): void
        {
            throw new RuntimeException('Fonnte gagal.');
        }
    });

    $this->artisan('app:process-due-reminders')
        ->assertExitCode(0);

    $item = $item->fresh();
    expect($item->triggered_at)->not->toBeNull();
    expect($item->whatsapp_sent_at)->toBeNull();
    expect($item->whatsapp_attempt_count)->toBe(1);
    expect($item->whatsapp_last_error)->toBe('Fonnte gagal.');
});
