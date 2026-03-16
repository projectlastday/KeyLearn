<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WidgetTodoItem extends Model
{
    protected $fillable = [
        'widget_id',
        'status_id',
        'content',
        'sort_order',
    ];

    public function widget(): BelongsTo
    {
        return $this->belongsTo(Widget::class);
    }

    public function status(): BelongsTo
    {
        return $this->belongsTo(WidgetTodoStatus::class, 'status_id');
    }
}
