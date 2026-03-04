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

        $response = Http::timeout(20)
            ->withHeaders([
                'Authorization' => $token,
            ])
            ->asForm()
            ->post($endpoint, [
                'target' => $phone,
                'message' => $message,
            ]);

        if (! $response->successful()) {
            $message = data_get($response->json(), 'reason')
                ?? data_get($response->json(), 'message')
                ?? $response->body();

            throw new RuntimeException('Gagal mengirim OTP WhatsApp: '.$message);
        }
    }
}
