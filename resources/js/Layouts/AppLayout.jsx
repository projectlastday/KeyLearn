import ApplicationLogo from '@/Components/ApplicationLogo';
import { Link, usePage, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import axios from 'axios';

export default function AppLayout({ header, children, topics = [], isChatLayout = false }) {
    const { url, props } = usePage();
    const user = props.auth?.user;
    const sharedSidebarTopics = Array.isArray(props.sidebarTopics) ? props.sidebarTopics : [];
    const effectiveTopics = topics.length > 0 ? topics : sharedSidebarTopics;
    const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
        if (typeof window === 'undefined') return false;
        const saved = window.localStorage.getItem('keylearn.sidebar.open');
        if (saved === null) return false;
        return saved === 'true';
    });
    const [openMenus, setOpenMenus] = useState({ 'Ruang Kerja': url.startsWith('/workspaces') });
    const [dueReminders, setDueReminders] = useState([]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('keylearn.sidebar.open', String(isSidebarOpen));
        }
    }, [isSidebarOpen]);

    useEffect(() => {
        if (!user) {
            setDueReminders([]);
            return undefined;
        }

        let isCancelled = false;

        const fetchDueReminders = async () => {
            try {
                const response = await axios.get('/api/reminders/due');

                if (!isCancelled) {
                    setDueReminders(Array.isArray(response.data) ? response.data : []);
                }
            } catch {
            }
        };

        fetchDueReminders();
        const handleFocusRefresh = () => {
            fetchDueReminders();
        };

        const intervalId = window.setInterval(fetchDueReminders, 5000);
        window.addEventListener('focus', handleFocusRefresh);
        document.addEventListener('visibilitychange', handleFocusRefresh);

        return () => {
            isCancelled = true;
            window.clearInterval(intervalId);
            window.removeEventListener('focus', handleFocusRefresh);
            document.removeEventListener('visibilitychange', handleFocusRefresh);
        };
    }, [user]);

    const toggleMenu = (label) => {
        setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));
    };

    const handleWorkspaceClick = () => {
        if (!isSidebarOpen) {
            setIsSidebarOpen(true);
            setOpenMenus(prev => ({ ...prev, 'Ruang Kerja': true }));
            router.visit('/workspaces');
            return;
        }

        toggleMenu('Ruang Kerja');
    };

    const handleLogout = () => {
        router.post(route('logout'));
    };

    const formatReminderDateTime = (iso) => {
        if (!iso) return '-';

        return new Intl.DateTimeFormat('id-ID', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Jakarta',
        }).format(new Date(iso)) + ' WIB';
    };

    const acknowledgeReminder = async (id) => {
        try {
            await axios.post(`/api/reminders/items/${id}/acknowledge`);
            setDueReminders(prev => prev.filter((item) => item.id !== id));
        } catch {
        }
    };

    const workspaceChildren = [
        { label: 'Semua', href: '/workspaces?topic=Semua' },
        ...effectiveTopics.filter(t => t !== 'Semua').map(t => ({
            label: t,
            href: `/workspaces?topic=${t}`
        }))
    ];

    const navItems = [
        {
            label: 'Beranda',
            href: '/',
            active: url === '/',
            icon: (
                <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            ),
        },
        {
            label: 'Ruang Kerja',
            href: '/workspaces',
            active: url.startsWith('/workspaces'),
            icon: (
                <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
            ),
            children: workspaceChildren,
        },
        {
            label: 'Statistik',
            href: '/statistik',
            active: url.startsWith('/statistik'),
            icon: (
                <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20V10m5 10V4m5 16v-7M4 20h16" />
                </svg>
            ),
        },
    ];

    return (
        <div className="flex h-screen w-full overflow-hidden bg-[#fafafa]">
            <aside
                className={`app-sidebar z-20 flex flex-col border-r border-[#f4c88e]/40 bg-white transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64' : 'w-20'}`}
            >
                <div className="flex h-16 shrink-0 items-center justify-between px-4">
                    {isSidebarOpen ? (
                        <Link href="/" className="flex items-center gap-2 overflow-hidden">
                            <ApplicationLogo className="h-8 w-auto fill-current text-gray-800" />
                            <span className="whitespace-nowrap font-semibold text-gray-800">KeyLearn</span>
                        </Link>
                    ) : (
                        <Link href="/" className="mx-auto flex justify-center">
                            <ApplicationLogo className="h-8 w-auto fill-current text-gray-800" />
                        </Link>
                    )}
                </div>

                <nav className="flex-1 space-y-1 px-3 py-4">
                    {navItems.map((item) => (
                        <div key={item.label}>
                            {item.children ? (
                                <div className="flex flex-col">
                                    <button
                                        onClick={handleWorkspaceClick}
                                        className={`flex w-full items-center justify-between rounded-2xl px-3 py-2.5 transition-colors focus:outline-none ${item.active && !openMenus[item.label]
                                            ? 'bg-amber-100/50 text-amber-900'
                                            : openMenus[item.label]
                                                ? 'text-gray-900'
                                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                            }`}
                                    >
                                        <div className="flex items-center">
                                            <span className={item.active ? 'text-amber-600' : 'text-gray-400'}>
                                                {item.icon}
                                            </span>
                                            {isSidebarOpen && <span className="ml-3 font-medium">{item.label}</span>}
                                        </div>
                                        {isSidebarOpen && (
                                            <svg
                                                className={`h-4 w-4 transition-transform duration-200 ${openMenus[item.label] ? 'rotate-180 text-amber-600' : 'text-gray-400'}`}
                                                fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        )}
                                    </button>

                                    {isSidebarOpen && openMenus[item.label] && (
                                        <div className="mt-1 flex flex-col pl-11 pr-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                                            {item.children.map((child) => {
                                                const isActiveChild = url.includes(`topic=${child.label}`);
                                                return (
                                                    <Link
                                                        key={child.label}
                                                        href={child.href}
                                                        title={child.label}
                                                        className={`px-3 py-2 text-sm rounded-xl transition-colors ${isActiveChild
                                                            ? 'bg-amber-50 text-amber-900 font-medium'
                                                            : 'text-gray-500 hover:bg-amber-50 hover:text-amber-700'
                                                            }`}
                                                    >
                                                        {child.label.length > 20 ? child.label.substring(0, 20) + '...' : child.label}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <Link
                                    href={item.href}
                                    className={`flex items-center rounded-2xl px-3 py-2.5 transition-colors ${item.active
                                        ? 'bg-amber-100/50 text-amber-900'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                        }`}
                                    title={item.label}
                                >
                                    <span className={item.active ? 'text-amber-600' : 'text-gray-400'}>
                                        {item.icon}
                                    </span>
                                    {isSidebarOpen && <span className="ml-3 font-medium">{item.label}</span>}
                                </Link>
                            )}
                        </div>
                    ))}
                </nav>

                {user && (
                    <div className="px-3 pb-2">
                        <Link
                            href="/trash"
                            className={`flex items-center rounded-2xl px-3 py-2.5 transition-colors ${url.startsWith('/trash')
                                ? 'bg-amber-100/50 text-amber-900'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                }`}
                            title="Tong Sampah"
                        >
                            <span className={url.startsWith('/trash') ? 'text-amber-600' : 'text-gray-400'}>
                                <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </span>
                            {isSidebarOpen && <span className="ml-3 font-medium">Tong Sampah</span>}
                        </Link>
                    </div>
                )}

                <div className="border-t border-gray-100 p-4">
                    {user ? (
                        <div className={`flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
                            {isSidebarOpen ? (
                                <>
                                    <div className="overflow-hidden">
                                        <p className="truncate text-sm font-medium text-gray-800" title={user.name}>
                                            {user.name.length > 18 ? user.name.substring(0, 18) + '...' : user.name}
                                        </p>
                                        <p className="truncate text-xs text-gray-500" title={user.email}>
                                            {user.email.length > 22 ? user.email.substring(0, 22) + '...' : user.email}
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                                        title="Keluar"
                                    >
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={handleLogout}
                                    className="rounded-full bg-red-50 p-2 text-red-500 transition-colors hover:bg-red-100 hover:text-red-600"
                                    title="Keluar"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    ) : (
                        <Link
                            href={route('login')}
                            className={`flex items-center rounded-2xl px-3 py-2.5 text-gray-600 transition-colors hover:bg-amber-50 hover:text-amber-800 ${isSidebarOpen ? 'justify-start' : 'justify-center'}`}
                            title="Masuk"
                        >
                            {isSidebarOpen ? (
                                <div className="overflow-hidden">
                                    <p className="truncate text-sm font-medium text-gray-800">Masuk</p>
                                    <p className="truncate text-xs text-gray-500">Belum masuk</p>
                                </div>
                            ) : (
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f4c88e]/30">
                                    <svg className="h-5 w-5 text-[#a67c52]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                            )}
                        </Link>
                    )}
                </div>
            </aside>

            <div className="flex flex-1 flex-col overflow-hidden">
                <header className="app-header z-10 flex h-16 shrink-0 items-center justify-between border-b border-gray-100 bg-white px-4 sm:px-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(prev => !prev)}
                            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none"
                            aria-label="Toggle sidebar"
                        >
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>

                        <div className="hidden sm:block">
                            {header}
                        </div>
                    </div>

                    {!user && (
                        <div className="flex items-center gap-3">
                            <Link
                                href={route('login')}
                                className="px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:text-gray-900"
                            >
                                Masuk
                            </Link>
                            <Link
                                href={route('register')}
                                className="rounded-xl bg-[#a67c52] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#8a6642] focus:outline-none focus:ring-2 focus:ring-[#c4a882] focus:ring-offset-2"
                            >
                                Daftar
                            </Link>
                        </div>
                    )}
                </header>

                <main className={`app-container flex-1 bg-gray-50/30 ${isChatLayout ? 'flex flex-col overflow-hidden' : 'overflow-y-auto p-4 sm:p-6 sm:px-8'}`}>
                    <div className={`sm:hidden ${isChatLayout ? 'px-4 pt-4 pb-2 shrink-0' : 'mb-4'}`}>
                        {header}
                    </div>
                    {children}
                </main>
            </div>
            {user && dueReminders.length > 0 && (
                <div className="pointer-events-none fixed bottom-4 right-4 z-40 w-[min(24rem,calc(100vw-2rem))]">
                    <div className="pointer-events-auto rounded-3xl border border-[#e0d3c3] bg-white p-4 shadow-lg shadow-[#d7c5b2]/30">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-[#5a3e22]">Pengingat</p>
                                <p className="text-xs text-[#8c7a66]">Ada pengingat yang sudah waktunya.</p>
                            </div>
                            <span className="rounded-full bg-[#efe4d7] px-2 py-1 text-xs font-medium text-[#8c7a66]">
                                {dueReminders.length}
                            </span>
                        </div>
                        <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
                            {dueReminders.map((item) => (
                                <div key={item.id} className="rounded-2xl border border-[#eee3d6] bg-[#fcfaf7] px-3 py-3">
                                    <p className="text-sm font-medium text-[#5a3e22] break-words">{item.message}</p>
                                    <p className="mt-1 text-xs text-[#8c7a66]">
                                        {item.workspace_title || 'Folder'}{item.widget_title ? ` • ${item.widget_title}` : ''}
                                    </p>
                                    <p className="mt-1 text-xs text-[#a08f7b]">{formatReminderDateTime(item.remind_at)}</p>
                                    <div className="mt-3 flex items-center justify-end gap-2">
                                        {item.workspace_id && (
                                            <button
                                                type="button"
                                                onClick={() => router.visit(`/workspaces?workspace=${item.workspace_id}`)}
                                                className="px-3 py-1.5 rounded-xl text-xs font-medium text-[#6b5a47] hover:bg-[#efe4d7] transition-colors focus:outline-none"
                                            >
                                                Buka Folder
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => acknowledgeReminder(item.id)}
                                            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[#a67c52] text-white hover:bg-[#8b6640] transition-colors focus:outline-none"
                                        >
                                            Sudah Dilihat
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
