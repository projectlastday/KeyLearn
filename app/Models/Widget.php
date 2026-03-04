<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

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
}
