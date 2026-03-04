<?php

use App\Models\ChatSession;
use App\Models\Topic;
use App\Models\Widget;
use App\Models\Workspace;
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

Schedule::command('app:purge-soft-deleted')->dailyAt('00:30');
