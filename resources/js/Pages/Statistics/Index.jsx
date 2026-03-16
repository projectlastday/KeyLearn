import { Head, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import Breadcrumbs from '@/Components/Breadcrumbs';

function formatNumber(value) {
    return new Intl.NumberFormat('id-ID').format(value ?? 0);
}

function formatDuration(totalSeconds) {
    const seconds = Math.max(0, Number(totalSeconds) || 0);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (days > 0) {
        return `${days} hari ${hours} jam`;
    }

    if (hours > 0) {
        return `${hours} jam ${minutes} menit`;
    }

    if (minutes > 0) {
        return `${minutes} menit ${remainingSeconds} detik`;
    }

    return `${remainingSeconds} detik`;
}

function StatCard({ title, value, description }) {
    return (
        <div className="rounded-2xl border border-[#e6ddd0] bg-[#fdfbf8] p-5 transition-all hover:border-[#d4b896]">
            <p className="text-sm font-medium text-[#8c7a66]">{title}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-[#5a3e22]">{value}</p>
            <p className="mt-2 text-sm text-[#b08f6a]">{description}</p>
        </div>
    );
}

export default function Index({ selectedMonth, availableMonths = [], stats }) {
    const headerContent = (
        <Breadcrumbs
            items={[
                { label: 'Beranda', href: '/' },
                { label: 'Statistik' },
            ]}
        />
    );

    const handleMonthChange = (event) => {
        router.get('/statistik', { month: event.target.value }, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    return (
        <AppLayout header={headerContent}>
            <Head title="Statistik - KeyLearn" />

            <div className="mx-auto mt-6 max-w-5xl px-4 pb-20 sm:px-8">
                <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold text-[#5a3e22]">Statistik</h1>
                        <p className="mt-1 text-sm text-[#8c7a66]">
                            Ringkasan aktivitas belajar Anda di KeyLearn.
                        </p>
                    </div>

                    <div className="min-w-[220px]">
                        <label htmlFor="month" className="mb-2 block text-sm font-medium text-[#8c7a66]">
                            Bulan
                        </label>
                        <div className="relative">
                            <select
                                id="month"
                                value={selectedMonth}
                                onChange={handleMonthChange}
                                className="w-full appearance-none rounded-2xl border border-[#dccab4] bg-white px-4 py-3 pr-11 text-sm text-[#5a3e22] outline-none transition focus:border-[#c4a882] focus:ring-2 focus:ring-[#f1dfca]"
                            >
                                {availableMonths.map((month) => (
                                    <option key={month.value} value={month.value}>
                                        {month.label}
                                    </option>
                                ))}
                            </select>
                            <svg
                                className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a67c52]"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <StatCard
                        title="Total Topik"
                        value={formatNumber(stats.totalTopics)}
                        description="Jumlah topik aktif yang Anda miliki saat ini."
                    />
                    <StatCard
                        title="Total Ruang Kerja"
                        value={formatNumber(stats.totalWorkspaces)}
                        description="Jumlah ruang kerja aktif yang Anda miliki saat ini."
                    />
                    <StatCard
                        title="Total Widget Aktif"
                        value={formatNumber(stats.totalActiveWidgets)}
                        description="Jumlah widget aktif di seluruh workspace saat ini."
                    />
                    <StatCard
                        title="Widget Dibuat"
                        value={formatNumber(stats.widgetsCreatedInMonth)}
                        description="Widget baru yang dibuat pada bulan terpilih."
                    />
                    <StatCard
                        title="Pesan Dikirim"
                        value={formatNumber(stats.userMessagesSentInMonth)}
                        description="Jumlah pesan Anda yang dikirim pada bulan terpilih."
                    />
                    <StatCard
                        title="Total Durasi Timer"
                        value={formatDuration(stats.timerDurationInMonthSeconds)}
                        description={`${formatNumber(stats.newTimersInMonth)} timer baru pada bulan terpilih.`}
                    />
                </div>
            </div>
        </AppLayout>
    );
}
