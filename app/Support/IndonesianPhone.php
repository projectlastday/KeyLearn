<?php

namespace App\Support;

class IndonesianPhone
{
    public static function normalize(?string $value): ?string
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $value);
        if (! $digits) {
            return null;
        }

        if (str_starts_with($digits, '62')) {
            $normalized = $digits;
        } elseif (str_starts_with($digits, '0')) {
            $normalized = '62'.substr($digits, 1);
        } elseif (str_starts_with($digits, '8')) {
            $normalized = '62'.$digits;
        } else {
            return null;
        }

        $length = strlen($normalized);
        if ($length < 10 || $length > 15) {
            return null;
        }

        return '+'.$normalized;
    }
}
