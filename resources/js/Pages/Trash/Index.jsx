import React, { useMemo, useState, Fragment } from 'react';
import { Head } from '@inertiajs/react';
import { Dialog, Transition } from '@headlessui/react';
import AppLayout from '@/Layouts/AppLayout';
import Breadcrumbs from '@/Components/Breadcrumbs';
import axios from 'axios';

const tabs = [
    { key: 'topics', label: 'Topik' },
    { key: 'workspaces', label: 'Folder' },
    { key: 'widgets', label: 'Widget' },
];

export default function Index({ trashedTopics = [], trashedWorkspaces = [], trashedChats = [], trashedWidgets = [] }) {
    const [topics, setTopics] = useState(trashedTopics);
    const [workspaces, setWorkspaces] = useState(trashedWorkspaces);
    const [chats, setChats] = useState(trashedChats);
    const [widgets, setWidgets] = useState(trashedWidgets);
    const [activeTab, setActiveTab] = useState('topics');
    const [loading, setLoading] = useState({});
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [isEmptyTrashConfirmOpen, setIsEmptyTrashConfirmOpen] = useState(false);

    const combinedWidgetItems = useMemo(() => (
        [
            ...chats.map((item) => ({ ...item, trashType: 'chats' })),
            ...widgets.map((item) => ({ ...item, trashType: 'widgets' })),
        ].sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime())
    ), [chats, widgets]);

    const formatDate = (iso) => {
        return new Date(iso).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleRestore = async (type, id) => {
        const key = `${type}-${id}-restore`;
        setLoading(prev => ({ ...prev, [key]: true }));
        try {
            const response = await axios.post(`/api/trash/${type}/${id}/restore`);
            const restored = response.data?.restored || {};
            const restoredTopicIds = restored.topics || [];
            const restoredWorkspaceIds = restored.workspaces || [];
            const restoredChatIds = restored.chats || [];
            const restoredWidgetIds = restored.widgets || [];

            if (type === 'topics') {
                setTopics(prev => prev.filter(i => !restoredTopicIds.includes(i.id)));
                setWorkspaces(prev => prev.filter(i => !restoredWorkspaceIds.includes(i.id)));
                setChats(prev => prev.filter(i => !restoredChatIds.includes(i.id)));
                setWidgets(prev => prev.filter(i => !restoredWidgetIds.includes(i.id)));
            } else if (type === 'workspaces') {
                setTopics(prev => prev.filter(i => !restoredTopicIds.includes(i.id)));
                setWorkspaces(prev => prev.filter(i => !restoredWorkspaceIds.includes(i.id)));
                setChats(prev => prev.filter(i => !restoredChatIds.includes(i.id)));
                setWidgets(prev => prev.filter(i => !restoredWidgetIds.includes(i.id)));
            } else if (type === 'chats') {
                setChats(prev => prev.filter(i => i.id !== id));
            } else if (type === 'widgets') {
                setWidgets(prev => prev.filter(i => i.id !== id));
            }
        } catch {
        } finally {
            setLoading(prev => ({ ...prev, [key]: false }));
        }
    };

    const handleForceDelete = async (type, id) => {
        const key = `${type}-${id}-delete`;
        setLoading(prev => ({ ...prev, [key]: true }));
        try {
            await axios.delete(`/api/trash/${type}/${id}/force`);
            if (type === 'topics') setTopics(prev => prev.filter(i => i.id !== id));
            if (type === 'workspaces') setWorkspaces(prev => prev.filter(i => i.id !== id));
            if (type === 'chats') setChats(prev => prev.filter(i => i.id !== id));
            if (type === 'widgets') setWidgets(prev => prev.filter(i => i.id !== id));
        } catch {
        } finally {
            setLoading(prev => ({ ...prev, [key]: false }));
            setConfirmDelete(null);
        }
    };

    const handleEmptyTrash = async () => {
        setLoading(prev => ({ ...prev, emptyTrash: true }));
        try {
            await axios.delete('/api/trash/empty');
            setTopics([]);
            setWorkspaces([]);
            setChats([]);
            setWidgets([]);
        } catch {
        } finally {
            setLoading(prev => ({ ...prev, emptyTrash: false }));
            setIsEmptyTrashConfirmOpen(false);
        }
    };

    const currentItems = activeTab === 'topics'
        ? topics
        : activeTab === 'workspaces'
            ? workspaces
            : combinedWidgetItems;
    const apiType = activeTab === 'topics'
        ? 'topics'
        : activeTab === 'workspaces'
            ? 'workspaces'
            : 'widgets';
    const totalTrashedItems = topics.length + workspaces.length + combinedWidgetItems.length;

    const headerContent = (
        <Breadcrumbs
            items={[
                { label: 'Beranda', href: '/' },
                { label: 'Tong Sampah' },
            ]}
        />
    );

    return (
        <AppLayout header={headerContent}>
            <Head title="Tong Sampah - KeyLearn" />

            <div className="max-w-4xl mx-auto px-4 sm:px-8 mt-6 pb-20">
                <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h2 className="text-2xl font-semibold text-[#5a3e22] mb-1">Tong Sampah</h2>
                        <p className="text-[#8c7a66] text-sm">
                            Item yang dihapus akan tersimpan di sini. Anda bisa memulihkan atau menghapus secara permanen.
                        </p>
                    </div>
                    {totalTrashedItems > 0 && (
                        <button
                            type="button"
                            onClick={() => setIsEmptyTrashConfirmOpen(true)}
                            disabled={loading.emptyTrash}
                            className="inline-flex items-center rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 focus:outline-none disabled:opacity-50"
                        >
                            {loading.emptyTrash ? 'Mengosongkan...' : 'Kosongkan Tong Sampah'}
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2 mb-6 border-b border-[#e6ddd0]">
                    {tabs.map(tab => {
                        const count = tab.key === 'topics'
                            ? topics.length
                            : tab.key === 'workspaces'
                                ? workspaces.length
                                : combinedWidgetItems.length;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`px-4 py-2.5 text-sm font-medium transition-colors relative focus:outline-none ${activeTab === tab.key
                                    ? 'text-[#a67c52]'
                                    : 'text-[#8c7a66] hover:text-[#5a3e22]'
                                    }`}
                            >
                                {tab.label}
                                {count > 0 && (
                                    <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-[#a67c52] text-white' : 'bg-gray-200 text-gray-600'}`}>
                                        {count}
                                    </span>
                                )}
                                {activeTab === tab.key && (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#a67c52] rounded-full" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {currentItems.length === 0 ? (
                    <div className="py-16 flex flex-col items-center justify-center text-center">
                        <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <p className="text-[#8c7a66] text-sm">
                            {activeTab === 'topics' && 'Tidak ada topik yang dihapus.'}
                            {activeTab === 'workspaces' && 'Tidak ada folder yang dihapus.'}
                            {activeTab === 'widgets' && 'Tidak ada widget atau obrolan yang dihapus.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {currentItems.map(item => {
                            const itemApiType = item.trashType || apiType;
                            const restoreKey = `${itemApiType}-${item.id}-restore`;
                            const deleteKey = `${itemApiType}-${item.id}-delete`;
                            return (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between bg-[#fdfbf8] border border-[#e6ddd0] rounded-2xl px-5 py-4 transition-all hover:border-[#d4b896]"
                                >
                                    <div className="flex-1 min-w-0 mr-4">
                                        <p className="text-sm font-medium text-[#5a3e22] truncate" title={item.name || item.title}>
                                            {item.name || item.title}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            {item.type && activeTab === 'widgets' && (
                                                <span className="text-xs rounded-full bg-[#efe4d7] px-2 py-0.5 text-[#8c7a66] capitalize">
                                                    {item.type === 'chat'
                                                        ? 'Obrolan'
                                                        : item.type === 'note'
                                                        ? 'Catatan'
                                                        : item.type === 'whiteboard'
                                                            ? 'Whiteboard'
                                                        : item.type === 'reminder'
                                                            ? 'Pengingat'
                                                            : item.type === 'todo'
                                                                ? 'To-Do'
                                                        : item.type === 'timer'
                                                            ? 'Timer'
                                                            : item.type === 'youtube'
                                                                ? 'YouTube'
                                                                : item.type}
                                                </span>
                                            )}
                                            {item.topic && (
                                                <span className="text-xs text-[#b8a28a]">
                                                    {item.topic}
                                                </span>
                                            )}
                                            {item.workspace && (
                                                <span className="text-xs text-[#b8a28a]">
                                                    {item.workspace}
                                                </span>
                                            )}
                                            <span className="text-xs text-gray-400">
                                                Dihapus {formatDate(item.deleted_at)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => handleRestore(itemApiType, item.id)}
                                            disabled={loading[restoreKey]}
                                            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors focus:outline-none disabled:opacity-50"
                                        >
                                            {loading[restoreKey] ? 'Memulihkan...' : 'Pulihkan'}
                                        </button>
                                        <button
                                            onClick={() => setConfirmDelete({ type: itemApiType, id: item.id, name: item.name || item.title })}
                                            disabled={loading[deleteKey]}
                                            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors focus:outline-none disabled:opacity-50"
                                        >
                                            Hapus Permanen
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <Transition appear show={!!confirmDelete} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setConfirmDelete(null)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-gray-800/30 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-sm transform overflow-hidden bg-white rounded-2xl p-7 text-left align-middle shadow-lg transition-all border border-gray-200">
                                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-[#5a3e22] mb-1">
                                        Hapus Permanen?
                                    </Dialog.Title>
                                    <div className="mb-6">
                                        <p className="text-sm text-[#8c7a66]">
                                            <strong className="text-[#5a3e22]">{confirmDelete?.name}</strong> akan dihapus secara permanen dan tidak bisa dikembalikan lagi.
                                        </p>
                                    </div>
                                    <div className="flex justify-end gap-3">
                                        <button
                                            onClick={() => setConfirmDelete(null)}
                                            className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors focus:outline-none"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            onClick={() => confirmDelete && handleForceDelete(confirmDelete.type, confirmDelete.id)}
                                            className="px-6 py-2.5 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors focus:outline-none"
                                        >
                                            Ya, Hapus
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            <Transition appear show={isEmptyTrashConfirmOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setIsEmptyTrashConfirmOpen(false)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl border border-[#e7dccf] bg-white p-6 text-left align-middle shadow-xl transition-all">
                                    <Dialog.Title as="h3" className="text-lg font-semibold text-[#5a3e22]">
                                        Kosongkan Tong Sampah?
                                    </Dialog.Title>
                                    <p className="mt-2 text-sm text-[#8c7a66]">
                                        Semua item yang ada di tong sampah akan dihapus permanen dan tidak bisa dipulihkan kembali.
                                    </p>

                                    <div className="mt-6 flex justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setIsEmptyTrashConfirmOpen(false)}
                                            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 focus:outline-none"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleEmptyTrash}
                                            disabled={loading.emptyTrash}
                                            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none disabled:opacity-50"
                                        >
                                            {loading.emptyTrash ? 'Menghapus...' : 'Hapus Permanen Semua'}
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </AppLayout>
    );
}
