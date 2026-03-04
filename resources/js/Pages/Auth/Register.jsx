import { Head, Link, useForm } from '@inertiajs/react';
import ApplicationLogo from '@/Components/ApplicationLogo';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        phone: '',
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
                                <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-gray-700">
                                    Nomor WhatsApp
                                </label>
                                <input
                                    id="phone"
                                    type="text"
                                    value={data.phone}
                                    autoComplete="tel"
                                    className={`block w-full rounded-2xl border bg-white px-4 py-3 text-sm text-gray-800 placeholder-gray-400 transition-all duration-200 outline-none focus:ring-2 focus:ring-[#c4a882]/50 ${errors.phone ? 'border-red-400' : 'border-gray-200 focus:border-[#c4a882]'}`}
                                    placeholder="Contoh: 081234567890 atau +6281234567890"
                                    onChange={(e) => setData('phone', e.target.value)}
                                />
                                {errors.phone && <p className="mt-1.5 text-xs text-red-500">{errors.phone}</p>}
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
