<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PhoneVerification extends Model
{
    protected $fillable = [
        'user_id',
        'phone',
        'otp_hash',
        'expires_at',
        'attempt_count',
        'max_attempts',
        'resend_available_at',
        'verified_at',
        'invalidated_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'resend_available_at' => 'datetime',
            'verified_at' => 'datetime',
            'invalidated_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(PhoneVerificationEvent::class);
    }
}
