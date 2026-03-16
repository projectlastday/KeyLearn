<?php

use App\Models\Topic;
use App\Models\User;
use App\Models\Widget;
use App\Models\Workspace;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

function createPdfWorkspace(User $user): Workspace
{
    $topic = Topic::create([
        'user_id' => $user->id,
        'name' => 'Dokumen',
    ]);

    return Workspace::create([
        'user_id' => $user->id,
        'topic_id' => $topic->id,
        'title' => 'Materi PDF',
    ]);
}

test('user can create pdf widget in own workspace', function () {
    $user = User::factory()->create();
    $workspace = createPdfWorkspace($user);

    $response = $this->actingAs($user)->post('/api/widgets', [
        'workspace_id' => $workspace->id,
        'type' => 'pdf',
        'title' => 'Dokumen Fisika',
    ]);

    $response->assertCreated()
        ->assertJsonPath('type', 'pdf')
        ->assertJsonPath('pdf', null);

    $this->assertDatabaseHas('widgets', [
        'workspace_id' => $workspace->id,
        'type' => 'pdf',
        'title' => 'Dokumen Fisika',
    ]);
});

test('user can upload and replace pdf file in pdf widget', function () {
    Storage::fake('local');

    $user = User::factory()->create();
    $workspace = createPdfWorkspace($user);
    $widget = Widget::create([
        'workspace_id' => $workspace->id,
        'created_by' => $user->id,
        'type' => 'pdf',
        'title' => 'Dokumen Kimia',
        'size_preset' => 'M',
        'grid_x' => 1,
        'grid_y' => 1,
        'grid_w' => 6,
        'grid_h' => 2,
        'sort_order' => 1,
    ]);

    $firstFile = UploadedFile::fake()->createWithContent('modul-1.pdf', "%PDF-1.4\nfirst\n%%EOF");

    $firstResponse = $this->actingAs($user)
        ->post("/api/widget-pdfs/{$widget->id}/file", [
            'file' => $firstFile,
        ]);

    $firstResponse->assertOk()
        ->assertJsonPath('has_file', true)
        ->assertJsonPath('file_name', 'modul-1.pdf')
        ->assertJsonPath('last_page', 1);

    $firstPath = $widget->fresh()->pdf->path;
    Storage::disk('local')->assertExists($firstPath);

    $secondFile = UploadedFile::fake()->createWithContent('modul-2.pdf', "%PDF-1.4\nsecond\n%%EOF");

    $secondResponse = $this->actingAs($user)
        ->post("/api/widget-pdfs/{$widget->id}/file", [
            'file' => $secondFile,
        ]);

    $secondResponse->assertOk()
        ->assertJsonPath('file_name', 'modul-2.pdf')
        ->assertJsonPath('last_page', 1);

    $pdf = $widget->fresh()->pdf;
    Storage::disk('local')->assertMissing($firstPath);
    Storage::disk('local')->assertExists($pdf->path);
    expect($pdf->original_name)->toBe('modul-2.pdf');
});

test('user can stream uploaded pdf file from widget endpoint', function () {
    Storage::fake('local');

    $user = User::factory()->create();
    $workspace = createPdfWorkspace($user);
    $widget = Widget::create([
        'workspace_id' => $workspace->id,
        'created_by' => $user->id,
        'type' => 'pdf',
        'title' => 'Dokumen Streaming',
        'size_preset' => 'M',
        'grid_x' => 1,
        'grid_y' => 1,
        'grid_w' => 6,
        'grid_h' => 2,
        'sort_order' => 1,
    ]);

    $this->actingAs($user)
        ->post("/api/widget-pdfs/{$widget->id}/file", [
            'file' => UploadedFile::fake()->createWithContent('stream.pdf', "%PDF-1.4\nstream\n%%EOF"),
        ])
        ->assertOk();

    $this->actingAs($user)
        ->get("/api/widget-pdfs/{$widget->id}/file")
        ->assertOk()
        ->assertHeader('content-type', 'application/pdf');
});

test('pdf endpoints reject non pdf widget and invalid uploads', function () {
    Storage::fake('local');

    $user = User::factory()->create();
    $workspace = createPdfWorkspace($user);

    $noteWidget = Widget::create([
        'workspace_id' => $workspace->id,
        'created_by' => $user->id,
        'type' => 'note',
        'title' => 'Bukan PDF',
        'size_preset' => 'M',
        'grid_x' => 1,
        'grid_y' => 1,
        'grid_w' => 6,
        'grid_h' => 2,
        'sort_order' => 1,
    ]);

    $this->actingAs($user)
        ->post("/api/widget-pdfs/{$noteWidget->id}/file", [
            'file' => UploadedFile::fake()->create('dokumen.pdf', 10, 'application/pdf'),
        ])
        ->assertStatus(422)
        ->assertJsonPath('message', 'Widget ini bukan tipe PDF.');

    $pdfWidget = Widget::create([
        'workspace_id' => $workspace->id,
        'created_by' => $user->id,
        'type' => 'pdf',
        'title' => 'PDF Widget',
        'size_preset' => 'M',
        'grid_x' => 1,
        'grid_y' => 2,
        'grid_w' => 6,
        'grid_h' => 2,
        'sort_order' => 2,
    ]);

    $this->actingAs($user)
        ->post(
            "/api/widget-pdfs/{$pdfWidget->id}/file",
            [
                'file' => UploadedFile::fake()->create('dokumen.txt', 10, 'text/plain'),
            ],
            [
                'Accept' => 'application/json',
            ]
        )
        ->assertStatus(422)
        ->assertJsonValidationErrors(['file']);
});
