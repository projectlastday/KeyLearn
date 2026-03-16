<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class Widget extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'workspace_id',
        'created_by',
        'chat_session_id',
        'type',
        'title',
        'size_preset',
        'grid_x',
        'grid_y',
        'grid_w',
        'grid_h',
        'sort_order',
    ];

    protected static function booted(): void
    {
        static::deleting(function (Widget $widget) {
            if ($widget->isForceDeleting()) {
                $widget->note()->delete();
                $widget->youtube()->delete();
                $pdf = $widget->relationLoaded('pdf') ? $widget->pdf : $widget->pdf()->first();
                if ($pdf && $pdf->path) {
                    Storage::disk($pdf->disk ?: 'local')->delete($pdf->path);
                    $pdf->delete();
                }
                $widget->whiteboard()->delete();
                $widget->reminders()->delete();
                $widget->todoStatuses()->delete();
                $widget->todoItems()->delete();
                $widget->timer()->delete();
                if ($widget->chatSession) {
                    $widget->chatSession()->withTrashed()->first()?->forceDelete();
                }
            }
        });
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class)->withTrashed();
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function chatSession(): BelongsTo
    {
        return $this->belongsTo(ChatSession::class)->withTrashed();
    }

    public function note(): HasOne
    {
        return $this->hasOne(WidgetNote::class);
    }

    public function pdf(): HasOne
    {
        return $this->hasOne(WidgetPdf::class);
    }

    public function youtube(): HasOne
    {
        return $this->hasOne(WidgetYoutube::class);
    }

    public function whiteboard(): HasOne
    {
        return $this->hasOne(WidgetWhiteboard::class);
    }

    public function reminders(): HasMany
    {
        return $this->hasMany(WidgetReminder::class)->orderBy('remind_at');
    }

    public function todoStatuses(): HasMany
    {
        return $this->hasMany(WidgetTodoStatus::class)->orderBy('sort_order');
    }

    public function todoItems(): HasMany
    {
        return $this->hasMany(WidgetTodoItem::class)->orderBy('sort_order');
    }

    public function timer(): HasOne
    {
        return $this->hasOne(WidgetTimer::class);
    }

    public function timerSessions(): HasMany
    {
        return $this->hasMany(WidgetTimerSession::class)->orderByDesc('started_at');
    }
}
