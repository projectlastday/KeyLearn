<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'google_id',
        'avatar',
        'phone_verified_at',
        'phone_verification_required',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'phone_verified_at' => 'datetime',
            'phone_verification_required' => 'boolean',
            'password' => 'hashed',
        ];
    }

    public function topics(): HasMany
    {
        return $this->hasMany(Topic::class);
    }

    public function workspaces(): HasMany
    {
        return $this->hasMany(Workspace::class);
    }

    public function phoneVerifications(): HasMany
    {
        return $this->hasMany(PhoneVerification::class);
    }

    public function phoneVerificationEvents(): HasMany
    {
        return $this->hasMany(PhoneVerificationEvent::class);
    }

    public function widgets(): HasMany
    {
        return $this->hasMany(Widget::class, 'created_by');
    }

    public function hasVerifiedPhone(): bool
    {
        if (! config('auth.phone_verification.enabled', true)) {
            return true;
        }

        if (! $this->phone_verification_required) {
            return true;
        }

        return $this->phone_verified_at !== null;
    }
}
