<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\PhoneVerificationService;
use App\Support\IndonesianPhone;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    public function __construct(private readonly PhoneVerificationService $verificationService)
    {
    }

    /**
     * Display the registration view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'phone' => 'required|string|max:20',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $normalizedPhone = IndonesianPhone::normalize((string) $validated['phone']);
        if (! $normalizedPhone) {
            return back()->withErrors([
                'phone' => 'Nomor WhatsApp harus menggunakan format Indonesia (+62).',
            ])->withInput();
        }

        $phoneExists = User::query()->where('phone', $normalizedPhone)->exists();
        if ($phoneExists) {
            return back()->withErrors([
                'phone' => 'Nomor WhatsApp sudah digunakan akun lain.',
            ])->withInput();
        }

        $phoneVerificationEnabled = (bool) config('auth.phone_verification.enabled', true);

        $user = DB::transaction(function () use ($validated, $normalizedPhone, $phoneVerificationEnabled) {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'phone' => $normalizedPhone,
                'password' => Hash::make($validated['password']),
                'phone_verification_required' => $phoneVerificationEnabled,
                'phone_verified_at' => $phoneVerificationEnabled ? null : now(),
            ]);

            if ($phoneVerificationEnabled) {
                $this->verificationService->createAndSend($user);
            }

            return $user;
        });

        event(new Registered($user));

        Auth::login($user);

        if (! $phoneVerificationEnabled) {
            return redirect('/workspaces');
        }

        return redirect()->route('phone.verify.notice')
            ->with('status', 'OTP sudah dikirim ke WhatsApp Anda.');
    }
}
