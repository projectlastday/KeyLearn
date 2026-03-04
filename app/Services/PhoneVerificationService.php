<?php

namespace App\Services;

use App\Models\PhoneVerification;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class PhoneVerificationService
{
    public function __construct(private readonly FonnteClient $fonnteClient)
    {
    }

    public function createAndSend(User $user): PhoneVerification
    {
        if (! $user->phone) {
            throw ValidationException::withMessages([
                'phone' => 'Nomor WhatsApp belum tersedia.',
            ]);
        }

        return DB::transaction(function () use ($user) {
            $user->phoneVerifications()
                ->whereNull('verified_at')
                ->whereNull('invalidated_at')
                ->update(['invalidated_at' => now()]);

            [$verification, $otp] = $this->buildNewVerification($user);

            $this->sendOtp($user, $verification, $otp, false);

            return $verification;
        });
    }

    public function resend(User $user): PhoneVerification
    {
        if (! $user->phone) {
            throw ValidationException::withMessages([
                'phone' => 'Nomor WhatsApp belum tersedia.',
            ]);
        }

        return DB::transaction(function () use ($user) {
            $active = $this->activeVerification($user);
            $now = now();

            if ($active && $active->resend_available_at && $active->resend_available_at->isFuture()) {
                $seconds = $active->resend_available_at->diffInSeconds($now);

                throw ValidationException::withMessages([
                    'otp' => "Silakan tunggu {$seconds} detik untuk kirim ulang OTP.",
                ]);
            }

            if ($active) {
                $active->update(['invalidated_at' => $now]);
            }

            [$verification, $otp] = $this->buildNewVerification($user);

            $this->sendOtp($user, $verification, $otp, true);

            return $verification;
        });
    }

    public function verify(User $user, string $otp): void
    {
        $verification = $this->activeVerification($user);

        if (! $verification) {
            throw ValidationException::withMessages([
                'otp' => 'OTP tidak ditemukan. Silakan kirim ulang OTP.',
            ]);
        }

        $now = now();
        if ($verification->expires_at->isPast()) {
            $verification->update(['invalidated_at' => $now]);
            $this->event($user, $verification, 'expired');

            throw ValidationException::withMessages([
                'otp' => 'OTP sudah kedaluwarsa. Silakan kirim ulang OTP.',
            ]);
        }

        if ($verification->attempt_count >= $verification->max_attempts) {
            $verification->update(['invalidated_at' => $now]);
            $this->event($user, $verification, 'blocked');

            throw ValidationException::withMessages([
                'otp' => 'Batas percobaan OTP tercapai. Silakan kirim ulang OTP.',
            ]);
        }

        if (! Hash::check($otp, $verification->otp_hash)) {
            $verification->increment('attempt_count');
            $this->event($user, $verification->fresh(), 'verify_failed');

            $verification = $verification->fresh();
            if ($verification && $verification->attempt_count >= $verification->max_attempts) {
                $verification->update(['invalidated_at' => $now]);
                $this->event($user, $verification, 'blocked');

                throw ValidationException::withMessages([
                    'otp' => 'Batas percobaan OTP tercapai. Silakan kirim ulang OTP.',
                ]);
            }

            throw ValidationException::withMessages([
                'otp' => 'Kode OTP tidak valid.',
            ]);
        }

        DB::transaction(function () use ($user, $verification, $now) {
            $verification->update([
                'verified_at' => $now,
                'invalidated_at' => $now,
            ]);

            $user->forceFill([
                'phone_verified_at' => $now,
                'phone_verification_required' => true,
            ])->save();

            $this->event($user, $verification, 'verify_success');
        });
    }

    public function activeVerification(User $user): ?PhoneVerification
    {
        return $user->phoneVerifications()
            ->whereNull('verified_at')
            ->whereNull('invalidated_at')
            ->latest('id')
            ->first();
    }

    private function buildNewVerification(User $user): array
    {
        $otp = (string) random_int(100000, 999999);
        $now = now();

        $verification = $user->phoneVerifications()->create([
            'phone' => $user->phone,
            'otp_hash' => Hash::make($otp),
            'expires_at' => $now->copy()->addMinutes(5),
            'attempt_count' => 0,
            'max_attempts' => 5,
            'resend_available_at' => $now->copy()->addSeconds(60),
        ]);

        return [$verification, $otp];
    }

    private function sendOtp(User $user, PhoneVerification $verification, string $otp, bool $isResend): void
    {
        $message = "Kode OTP KeyLearn Anda: {$otp}. Berlaku 5 menit. Jangan bagikan kode ini.";

        try {
            $this->fonnteClient->sendMessage($user->phone, $message);
            $this->event($user, $verification, $isResend ? 'resend' : 'sent');
        } catch (RuntimeException $exception) {
            $this->event($user, $verification, 'blocked', [
                'reason' => $exception->getMessage(),
            ]);

            throw ValidationException::withMessages([
                'phone' => $exception->getMessage(),
            ]);
        }
    }

    private function event(User $user, ?PhoneVerification $verification, string $type, array $metadata = []): void
    {
        $user->phoneVerificationEvents()->create([
            'phone_verification_id' => $verification?->id,
            'event_type' => $type,
            'metadata' => empty($metadata) ? null : $metadata,
        ]);
    }

    public function cooldownSeconds(User $user): int
    {
        $active = $this->activeVerification($user);
        if (! $active || ! $active->resend_available_at) {
            return 0;
        }

        if ($active->resend_available_at->isPast()) {
            return 0;
        }

        return (int) Carbon::now()->diffInSeconds($active->resend_available_at);
    }
}
