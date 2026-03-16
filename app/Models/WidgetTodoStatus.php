<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WidgetTodoStatus extends Model
{
    protected $fillable = [
        'widget_id',
        'name',
        'is_system',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_system' => 'boolean',
        ];
    }

    public function widget(): BelongsTo
    {
        return $this->belongsTo(Widget::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(WidgetTodoItem::class, 'status_id');
    }

    public static function defaultStatusNames(): array
    {
        return ['belum', 'sedang dilakukan', 'selesai dilakukan'];
    }
}
