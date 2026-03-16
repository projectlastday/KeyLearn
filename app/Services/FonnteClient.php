<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class FonnteClient
{
    public function sendMessage(string $phone, string $message): void
    {
        if (app()->environment('testing')) {
            return;
        }

        $token = (string) config('services.fonnte.token');
        $endpoint = (string) config('services.fonnte.endpoint', 'https://api.fonnte.com/send');

        if ($token === '') {
            throw new RuntimeException('Token Fonnte belum dikonfigurasi.');
        }

        $target = preg_replace('/\D+/', '', $phone) ?: $phone;

        $response = Http::timeout(20)
            ->withHeaders([
                'Authorization' => $token,
            ])
            ->asForm()
            ->post($endpoint, [
                'target' => $target,
                'message' => $message,
            ]);

        if (! $response->successful()) {
            $message = data_get($response->json(), 'reason')
                ?? data_get($response->json(), 'message')
                ?? $response->body();

            throw new RuntimeException('Gagal mengirim WhatsApp: '.$message);
        }

        $payload = $response->json();
        if (is_array($payload) && array_key_exists('status', $payload)) {
            $providerAccepted = filter_var($payload['status'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            $isAccepted = $providerAccepted ?? in_array($payload['status'], [1, '1'], true);

            if (! $isAccepted) {
                $reason = data_get($payload, 'reason')
                    ?? data_get($payload, 'message')
                    ?? 'Provider menolak pesan.';

                throw new RuntimeException('Gagal mengirim WhatsApp: '.$reason);
            }
        }
    }
}
