<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WidgetYoutube extends Model
{
    protected $fillable = [
        'widget_id',
        'source_url',
        'video_id',
    ];

    public function widget(): BelongsTo
    {
        return $this->belongsTo(Widget::class);
    }
}
