<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WidgetWhiteboard extends Model
{
    protected $fillable = [
        'widget_id',
        'strokes',
    ];

    protected $casts = [
        'strokes' => 'array',
    ];

    public function widget(): BelongsTo
    {
        return $this->belongsTo(Widget::class);
    }
}
