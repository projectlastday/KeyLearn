<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WidgetPdf extends Model
{
    protected $fillable = [
        'widget_id',
        'disk',
        'path',
        'original_name',
        'mime_type',
        'size',
        'last_page',
    ];

    public function widget(): BelongsTo
    {
        return $this->belongsTo(Widget::class);
    }
}
