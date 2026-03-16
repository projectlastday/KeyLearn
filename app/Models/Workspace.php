<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Workspace extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'topic_id',
        'title',
        'description',
        'last_opened_at',
    ];

    protected function casts(): array
    {
        return [
            'last_opened_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::deleting(function (Workspace $workspace) {
            if ($workspace->isForceDeleting()) {
                $workspace->chatSessions()->withTrashed()->get()->each->forceDelete();
                $workspace->widgets()->withTrashed()->get()->each->forceDelete();
                return;
            }

            $workspace->chatSessions()->get()->each->delete();
            $workspace->widgets()->get()->each->delete();
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function topic(): BelongsTo
    {
        return $this->belongsTo(Topic::class)->withTrashed();
    }

    public function chatSessions(): HasMany
    {
        return $this->hasMany(ChatSession::class);
    }

    public function widgets(): HasMany
    {
        return $this->hasMany(Widget::class);
    }

    public function openEvents(): HasMany
    {
        return $this->hasMany(WorkspaceOpenEvent::class);
    }
}
