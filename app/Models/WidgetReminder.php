<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WidgetReminder extends Model
{
    protected $fillable = [
        'widget_id',
        'message',
        'remind_at',
        'timezone',
        'send_whatsapp',
        'triggered_at',
        'in_app_seen_at',
        'whatsapp_sent_at',
        'whatsapp_attempt_count',
        'last_whatsapp_attempt_at',
        'whatsapp_last_error',
    ];

    protected function casts(): array
    {
        return [
            'remind_at' => 'datetime',
            'send_whatsapp' => 'boolean',
            'triggered_at' => 'datetime',
            'in_app_seen_at' => 'datetime',
            'whatsapp_sent_at' => 'datetime',
            'last_whatsapp_attempt_at' => 'datetime',
        ];
    }

    public function widget(): BelongsTo
    {
        return $this->belongsTo(Widget::class);
    }
}
