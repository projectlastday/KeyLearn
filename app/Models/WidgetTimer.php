<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WidgetTimer extends Model
{
    protected $fillable = [
        'widget_id',
        'elapsed_seconds',
        'is_running',
        'started_at',
    ];

    protected function casts(): array
    {
        return [
            'elapsed_seconds' => 'integer',
            'is_running' => 'boolean',
            'started_at' => 'datetime',
        ];
    }

    public function widget(): BelongsTo
    {
        return $this->belongsTo(Widget::class);
    }
}
