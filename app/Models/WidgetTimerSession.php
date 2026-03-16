<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WidgetTimerSession extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'widget_id',
        'started_at',
        'ended_at',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    public function widget(): BelongsTo
    {
        return $this->belongsTo(Widget::class);
    }
}
