import { Head, Link, useForm } from '@inertiajs/react';
import ApplicationLogo from '@/Components/ApplicationLogo';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <>
            <Head title="Masuk" />
            <div className="flex min-h-screen items-center justify-center bg-[#e8e4df] px-4 py-12">
                <div className="w-full max-w-md">
                    <div className="mb-8 text-center">
                        <Link href="/" className="inline-flex items-center gap-2.5">
                            <ApplicationLogo className="h-10 w-auto fill-current text-[#a67c52]" />
                            <span className="text-2xl font-bold text-gray-800">KeyLearn</span>
                        </Link>
                        <p className="mt-3 text-sm text-gray-500">Masuk ke akun Anda untuk melanjutkan belajar.</p>
                    </div>

                    <div className="rounded-3xl border border-[#f4c88e]/40 bg-white p-8 shadow-sm">
                        {status && (
                            <div className="mb-5 rounded-2xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                                {status}
                            </div>
                        )}

                        <form onSubmit={submit} className="space-y-5">
                            <div>
                                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
                                    Alamat Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    autoComplete="username"
                                    autoFocus
                                    className={`block w-full rounded-2xl border bg-white px-4 py-3 text-sm text-gray-800 placeholder-gray-400 transition-all duration-200 outline-none focus:ring-2 focus:ring-[#c4a882]/50 ${errors.email ? 'border-red-400' : 'border-gray-200 focus:border-[#c4a882]'}`}
                                    placeholder="nama@email.com"
                                    onChange={(e) => setData('email', e.target.value)}
                                />
                                {errors.email && <p className="mt-1.5 text-xs text-red-500">{errors.email}</p>}
                            </div>

                            <div>
                                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
                                    Kata Sandi
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    value={data.password}
                                    autoComplete="current-password"
                                    className={`block w-full rounded-2xl border bg-white px-4 py-3 text-sm text-gray-800 placeholder-gray-400 transition-all duration-200 outline-none focus:ring-2 focus:ring-[#c4a882]/50 ${errors.password ? 'border-red-400' : 'border-gray-200 focus:border-[#c4a882]'}`}
                                    placeholder="Masukkan kata sandi Anda"
                                    onChange={(e) => setData('password', e.target.value)}
                                />
                                {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password}</p>}
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="flex cursor-pointer items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={data.remember}
                                        onChange={(e) => setData('remember', e.target.checked)}
                                        className="h-4 w-4 rounded-md border-gray-300 text-[#c4a882] focus:ring-[#c4a882]"
                                    />
                                    <span className="text-sm text-gray-500">Ingat saya</span>
                                </label>

                                {canResetPassword && (
                                    <Link
                                        href={route('password.request')}
                                        className="text-sm text-[#a67c52] transition-colors hover:text-[#8a6642]"
                                    >
                                        Lupa kata sandi?
                                    </Link>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full rounded-2xl bg-[#a67c52] px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#8a6642] focus:outline-none focus:ring-2 focus:ring-[#c4a882] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {processing ? 'Memproses...' : 'Masuk'}
                            </button>
                        </form>
                    </div>

                    <p className="mt-6 text-center text-sm text-gray-500">
                        Belum punya akun?{' '}
                        <Link href={route('register')} className="font-medium text-[#a67c52] transition-colors hover:text-[#8a6642]">
                            Daftar sekarang
                        </Link>
                    </p>
                </div>
            </div>
        </>
    );
}
