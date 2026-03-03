import { Head, Link, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import Breadcrumbs from '@/Components/Breadcrumbs';

const featureCards = [
    {
        title: 'Ruang Kerja',
        description: 'Kelola materi belajar Anda dalam folder yang rapi dan terorganisir.',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-[#a67c52]">
                <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.122c.366.366.862.572 1.378.659H19.5a3 3 0 013 3v1.706a3.012 3.012 0 00-2.25-.836h-15c-.844 0-1.632.346-2.25.836z" />
            </svg>
        ),
    },
    {
        title: 'Obrolan Cerdas',
        description: 'Tanya jawab kontekstual dengan AI berdasarkan dokumen yang Anda unggah.',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-8 h-8 text-[#a67c52]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
            </svg>
        ),
    },
    {
        title: 'Mode Konsensus',
        description: 'Dapatkan jawaban paling akurat dari beberapa model AI sekaligus.',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-8 h-8 text-[#a67c52]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
        ),
    },
];

export default function Welcome({ recentChats = [] }) {
    const { props } = usePage();
    const isLoggedIn = Boolean(props.auth?.user);

    const headerContent = (
        <Breadcrumbs items={[{ label: 'Beranda' }]} />
    );

    return (
        <AppLayout header={headerContent}>
            <Head title="Beranda - KeyLearn" />

            <div className="max-w-5xl mx-auto px-4 sm:px-8 mt-6 pb-20">
                <div className="mb-16">
                    <div className="max-w-2xl">
                        <h1 className="text-3xl sm:text-4xl font-bold text-[#5a3e22] mb-4 leading-tight">
                            Selamat Datang di KeyLearn
                        </h1>
                        <p className="text-[#8c7a66] text-base sm:text-lg leading-relaxed mb-8">
                            Platform belajar cerdas yang didukung AI untuk membantu Anda memahami materi lebih dalam. Unggah dokumen, ajukan pertanyaan, dan dapatkan jawaban akurat.
                        </p>
                        <Link
                            href="/workspaces"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-[#a67c52] text-white hover:bg-[#8b6640] transition-colors focus:outline-none shadow-sm"
                        >
                            Mulai Belajar
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                        </Link>
                    </div>
                </div>

                {isLoggedIn ? (
                    <div className="mb-10">
                        <h2 className="text-lg font-semibold text-[#5a3e22] mb-6">Obrolan terakhir</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {recentChats.length > 0 ? (
                                recentChats.map((chat) => (
                                    <Link
                                        key={chat.id}
                                        href={`/workspaces/${chat.workspace_id}/chat/${chat.id}`}
                                        className="bg-[#fdfbf8] rounded-2xl border-2 border-[#d4b896] p-6 hover:border-[#b8926a] hover:shadow-md transition-all"
                                        title={chat.title}
                                    >
                                        <div className="mb-4 opacity-80 text-[#a67c52]">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.7" stroke="currentColor" className="w-8 h-8">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-base font-semibold text-[#5a3e22] mb-2">
                                            {chat.title.length > 40 ? `${chat.title.substring(0, 40)}...` : chat.title}
                                        </h3>
                                        <p className="text-sm text-[#8c7a66] leading-relaxed mb-2">
                                            {chat.workspace_title || 'Ruang Kerja'}
                                        </p>
                                        <p className="text-xs text-[#b8a28a]">
                                            {chat.updated_at ? new Date(chat.updated_at).toLocaleDateString('id-ID') : 'Baru saja dibuka'}
                                        </p>
                                    </Link>
                                ))
                            ) : (
                                <div className="md:col-span-3 bg-[#fdfbf8] rounded-2xl border-2 border-[#d4b896] p-6 text-sm text-[#8c7a66]">
                                    Belum ada riwayat obrolan. Buka ruang kerja dan mulai obrolan baru.
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="mb-10">
                        <h2 className="text-lg font-semibold text-[#5a3e22] mb-6">Fitur Utama</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {featureCards.map((card) => (
                                <div
                                    key={card.title}
                                    className="bg-[#fdfbf8] rounded-2xl border-2 border-[#d4b896] p-6 hover:border-[#b8926a] hover:shadow-md transition-all"
                                >
                                    <div className="mb-4 opacity-80">
                                        {card.icon}
                                    </div>
                                    <h3 className="text-base font-semibold text-[#5a3e22] mb-2">
                                        {card.title}
                                    </h3>
                                    <p className="text-sm text-[#8c7a66] leading-relaxed">
                                        {card.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="text-center pt-8">
                    <p className="text-sm text-[#b8a28a]">
                        Fitur lebih lanjut sedang dalam pengembangan.
                    </p>
                </div>
            </div>
        </AppLayout>
    );
}
