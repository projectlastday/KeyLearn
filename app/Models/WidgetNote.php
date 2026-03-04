<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WidgetNote extends Model
{
    protected $fillable = [
        'widget_id',
        'content',
    ];

    public function widget(): BelongsTo
    {
        return $this->belongsTo(Widget::class);
    }
}
