<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\PhoneVerificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PhoneVerificationController extends Controller
{
    public function __construct(private readonly PhoneVerificationService $verificationService)
    {
    }

    public function create(Request $request): Response|RedirectResponse
    {
        $user = $request->user();
        if (! $user) {
            return redirect()->route('login');
        }

        if ($user->hasVerifiedPhone()) {
            return redirect('/workspaces');
        }

        $active = $this->verificationService->activeVerification($user);
        if (! $active) {
            $active = $this->verificationService->createAndSend($user);
        }

        return Inertia::render('Auth/VerifyPhone', [
            'phone' => $user->phone,
            'status' => session('status'),
            'cooldownSeconds' => $this->verificationService->cooldownSeconds($user),
            'expiresAt' => $active?->expires_at?->toISOString(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        if ($request->user()?->hasVerifiedPhone()) {
            return redirect('/workspaces');
        }

        $request->validate([
            'otp' => ['required', 'digits:6'],
        ]);

        $this->verificationService->verify($request->user(), (string) $request->input('otp'));

        return redirect('/workspaces');
    }

    public function resend(Request $request): RedirectResponse
    {
        if ($request->user()?->hasVerifiedPhone()) {
            return redirect('/workspaces');
        }

        $this->verificationService->resend($request->user());

        return back()->with('status', 'Kode OTP baru sudah dikirim ke WhatsApp Anda.');
    }
}
