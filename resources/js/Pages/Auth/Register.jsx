import { Head, Link, useForm } from '@inertiajs/react';
import ApplicationLogo from '@/Components/ApplicationLogo';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <>
            <Head title="Daftar" />
            <div className="flex min-h-screen items-center justify-center bg-[#e8e4df] px-4 py-12">
                <div className="w-full max-w-md">
                    <div className="mb-8 text-center">
                        <Link href="/" className="inline-flex items-center gap-2.5">
                            <ApplicationLogo className="h-10 w-auto fill-current text-[#a67c52]" />
                            <span className="text-2xl font-bold text-gray-800">KeyLearn</span>
                        </Link>
                        <p className="mt-3 text-sm text-gray-500">Buat akun baru dan mulai perjalanan belajarmu.</p>
                    </div>

                    <div className="rounded-3xl border border-[#f4c88e]/40 bg-white p-8 shadow-sm">
                        <a
                            href={route('google.redirect')}
                            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-all duration-200 hover:border-[#c4a882] hover:bg-gray-50"
                        >
                            <svg className="h-5 w-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Lanjutkan dengan Google
                        </a>

                        <div className="my-6 flex items-center gap-4">
                            <div className="h-px flex-1 bg-gray-200"></div>
                            <span className="text-xs font-medium text-gray-400">atau</span>
                            <div className="h-px flex-1 bg-gray-200"></div>
                        </div>

                        <form onSubmit={submit} className="space-y-5">
                            <div>
                                <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-gray-700">
                                    Nama Lengkap
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    value={data.name}
                                    autoComplete="name"
                                    autoFocus
                                    className={`block w-full rounded-2xl border bg-white px-4 py-3 text-sm text-gray-800 placeholder-gray-400 transition-all duration-200 outline-none focus:ring-2 focus:ring-[#c4a882]/50 ${errors.name ? 'border-red-400' : 'border-gray-200 focus:border-[#c4a882]'}`}
                                    placeholder="Masukkan nama lengkap Anda"
                                    onChange={(e) => setData('name', e.target.value)}
                                />
                                {errors.name && <p className="mt-1.5 text-xs text-red-500">{errors.name}</p>}
                            </div>

                            <div>
                                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
                                    Alamat Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    autoComplete="username"
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
                                    autoComplete="new-password"
                                    className={`block w-full rounded-2xl border bg-white px-4 py-3 text-sm text-gray-800 placeholder-gray-400 transition-all duration-200 outline-none focus:ring-2 focus:ring-[#c4a882]/50 ${errors.password ? 'border-red-400' : 'border-gray-200 focus:border-[#c4a882]'}`}
                                    placeholder="Minimal 8 karakter"
                                    onChange={(e) => setData('password', e.target.value)}
                                />
                                {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password}</p>}
                            </div>

                            <div>
                                <label htmlFor="password_confirmation" className="mb-1.5 block text-sm font-medium text-gray-700">
                                    Konfirmasi Kata Sandi
                                </label>
                                <input
                                    id="password_confirmation"
                                    type="password"
                                    value={data.password_confirmation}
                                    autoComplete="new-password"
                                    className={`block w-full rounded-2xl border bg-white px-4 py-3 text-sm text-gray-800 placeholder-gray-400 transition-all duration-200 outline-none focus:ring-2 focus:ring-[#c4a882]/50 ${errors.password_confirmation ? 'border-red-400' : 'border-gray-200 focus:border-[#c4a882]'}`}
                                    placeholder="Ulangi kata sandi Anda"
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                />
                                {errors.password_confirmation && <p className="mt-1.5 text-xs text-red-500">{errors.password_confirmation}</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full rounded-2xl bg-[#a67c52] px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#8a6642] focus:outline-none focus:ring-2 focus:ring-[#c4a882] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {processing ? 'Memproses...' : 'Daftar'}
                            </button>
                        </form>
                    </div>

                    <p className="mt-6 text-center text-sm text-gray-500">
                        Sudah punya akun?{' '}
                        <Link href={route('login')} className="font-medium text-[#a67c52] transition-colors hover:text-[#8a6642]">
                            Masuk di sini
                        </Link>
                    </p>
                </div>
            </div>
        </>
    );
}
