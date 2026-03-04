import { Head, useForm } from '@inertiajs/react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import { useEffect, useMemo, useState } from 'react';

export default function VerifyPhone({ phone, status = null, cooldownSeconds = 0, expiresAt = null }) {
    const { data, setData, post, processing, errors } = useForm({
        otp: '',
    });
    const resendForm = useForm({});
    const [cooldown, setCooldown] = useState(cooldownSeconds);

    useEffect(() => {
        if (cooldown <= 0) return undefined;
        const timer = setInterval(() => {
            setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    const expiresLabel = useMemo(() => {
        if (!expiresAt) return null;
        return new Date(expiresAt).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    }, [expiresAt]);

    const submitOtp = (e) => {
        e.preventDefault();
        post(route('phone.verify'));
    };

    const resendOtp = () => {
        resendForm.post(route('phone.verify.resend'), {
            onSuccess: (page) => {
                const nextCooldown = page.props?.cooldownSeconds ?? 60;
                setCooldown(nextCooldown);
            },
        });
    };

    return (
        <>
            <Head title="Verifikasi WhatsApp" />
            <div className="flex min-h-screen items-center justify-center bg-[#e8e4df] px-4 py-12">
                <div className="w-full max-w-md">
                    <div className="mb-8 text-center">
                        <div className="inline-flex items-center gap-2.5">
                            <ApplicationLogo className="h-10 w-auto fill-current text-[#a67c52]" />
                            <span className="text-2xl font-bold text-gray-800">KeyLearn</span>
                        </div>
                        <p className="mt-3 text-sm text-gray-500">Masukkan OTP WhatsApp untuk mengaktifkan akun Anda.</p>
                    </div>

                    <div className="rounded-3xl border border-[#f4c88e]/40 bg-white p-8 shadow-sm">
                        <div className="mb-5 rounded-2xl bg-[#f7f3ee] px-4 py-3 text-sm text-[#6b5a47]">
                            <p>Nomor tujuan: <span className="font-semibold text-[#5a3e22]">{phone}</span></p>
                            {expiresLabel && <p className="mt-1 text-xs text-[#8c7a66]">OTP berlaku sampai {expiresLabel}</p>}
                        </div>

                        {status && (
                            <div className="mb-5 rounded-2xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                                {status}
                            </div>
                        )}

                        <form onSubmit={submitOtp} className="space-y-5">
                            <div>
                                <label htmlFor="otp" className="mb-1.5 block text-sm font-medium text-gray-700">
                                    Kode OTP
                                </label>
                                <input
                                    id="otp"
                                    type="text"
                                    maxLength={6}
                                    inputMode="numeric"
                                    autoFocus
                                    value={data.otp}
                                    onChange={(e) => setData('otp', e.target.value.replace(/\D+/g, '').slice(0, 6))}
                                    className={`block w-full rounded-2xl border bg-white px-4 py-3 text-center text-lg tracking-[0.35em] text-gray-800 placeholder-gray-400 transition-all duration-200 outline-none focus:ring-2 focus:ring-[#c4a882]/50 ${errors.otp ? 'border-red-400' : 'border-gray-200 focus:border-[#c4a882]'}`}
                                    placeholder="000000"
                                />
                                {errors.otp && <p className="mt-1.5 text-xs text-red-500">{errors.otp}</p>}
                                {errors.phone && <p className="mt-1.5 text-xs text-red-500">{errors.phone}</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full rounded-2xl bg-[#a67c52] px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#8a6642] focus:outline-none focus:ring-2 focus:ring-[#c4a882] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {processing ? 'Memverifikasi...' : 'Verifikasi OTP'}
                            </button>
                        </form>

                        <button
                            type="button"
                            onClick={resendOtp}
                            disabled={cooldown > 0 || resendForm.processing}
                            className="mt-4 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-medium text-[#6b5a47] transition-all duration-200 hover:border-[#c4a882] hover:bg-[#faf7f2] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {resendForm.processing
                                ? 'Mengirim ulang...'
                                : cooldown > 0
                                    ? `Kirim ulang OTP (${cooldown}s)`
                                    : 'Kirim ulang OTP'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
