<?php

use App\Models\ChatSession;
use App\Models\Topic;
use App\Models\Widget;
use App\Models\Workspace;
use App\Services\ReminderProcessor;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('app:purge-soft-deleted', function () {
    $cutoff = now()->subDays(30);

    Topic::onlyTrashed()->where('deleted_at', '<=', $cutoff)->get()->each->forceDelete();
    Workspace::onlyTrashed()->where('deleted_at', '<=', $cutoff)->get()->each->forceDelete();
    ChatSession::onlyTrashed()->where('deleted_at', '<=', $cutoff)->get()->each->forceDelete();
    Widget::onlyTrashed()->where('deleted_at', '<=', $cutoff)->get()->each->forceDelete();

    $this->info('Purge soft delete 30 hari selesai.');
});

Artisan::command('app:process-due-reminders', function (ReminderProcessor $processor) {
    $stats = $processor->processWithStats();

    $this->info("Pemrosesan pengingat selesai. Item baru dipicu: {$stats['triggered_count']}.");
    $this->line("Dipicu tanpa WA aktif: {$stats['triggered_without_whatsapp']}.");
    $this->line("Kandidat retry WA: {$stats['retry_candidates']}.");
    $this->line("WA attempt/sukses/gagal: {$stats['whatsapp_attempts']}/{$stats['whatsapp_success']}/{$stats['whatsapp_failed']}.");

    if (! empty($stats['error_reasons'])) {
        $this->warn('Alasan gagal WA terbaru:');
        foreach (array_slice($stats['error_reasons'], 0, 3) as $reason) {
            $this->line("- {$reason}");
        }
    }
});

Schedule::command('app:purge-soft-deleted')->dailyAt('00:30');
Schedule::command('app:process-due-reminders')->everyMinute();
