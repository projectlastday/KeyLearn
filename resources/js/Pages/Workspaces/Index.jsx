import React, { useState, useEffect, useRef, Fragment, useMemo } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import { Dialog, Transition } from '@headlessui/react';
import AppLayout from '@/Layouts/AppLayout';
import Breadcrumbs from '@/Components/Breadcrumbs';
import axios from 'axios';

const icons = {
    folder: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-[#a67c52]">
            <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.122c.366.366.862.572 1.378.659H19.5a3 3 0 013 3v1.706a3.012 3.012 0 00-2.25-.836h-15c-.844 0-1.632.346-2.25.836z" />
        </svg>
    ),
    plus: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
    ),
    message: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6 text-[#b8977a]">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
        </svg>
    ),
    edit: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
        </svg>
    ),
    back: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
    )
};

export default function Index({ initialWorkspaces = [], initialTopics = [], initialTopicMap = {} }) {
    const { url } = usePage();
    const safeInitialWorkspaces = Array.isArray(initialWorkspaces)
        ? initialWorkspaces
        : Object.values(initialWorkspaces || {});
    const [workspaces, setWorkspaces] = useState(safeInitialWorkspaces);
    const [customTopics, setCustomTopics] = useState(Array.from(new Set(initialTopics)));
    const defaultTopics = useMemo(() => ['Semua'], []);
    const dynamicTopics = useMemo(() => (
        Array.from(new Set(
            workspaces
                .map(w => w.topic)
                .filter(topic => customTopics.includes(topic))
        ))
    ), [workspaces, customTopics]);
    const allTopics = useMemo(() => (
        Array.from(new Set([...defaultTopics, ...customTopics, ...dynamicTopics]))
    ), [defaultTopics, customTopics, dynamicTopics]);

    const [activeWorkspaceId, setActiveWorkspaceId] = useState(null);
    const [isTopicDropdownOpen, setIsTopicDropdownOpen] = useState(false);
    const topicDropdownRef = useRef(null);
    const [isAddWorkspaceModalOpen, setIsAddWorkspaceModalOpen] = useState(false);
    const [isAddTopicModalOpen, setIsAddTopicModalOpen] = useState(false);
    const [newWorkspaceName, setNewWorkspaceName] = useState('');
    const [workspaceError, setWorkspaceError] = useState('');
    const [workspaceTopicError, setWorkspaceTopicError] = useState('');
    const [newTopicName, setNewTopicName] = useState('');
    const [topicError, setTopicError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTopic, setSelectedTopic] = useState('Semua');
    const [dropdownSelectedTopic, setDropdownSelectedTopic] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const isAllTopicSelected = selectedTopic === 'Semua';
    const selectableTopics = useMemo(
        () => allTopics.filter((topic) => topic !== 'Semua'),
        [allTopics]
    );

    const [itemToDelete, setItemToDelete] = useState(null);
    const [topicIdMap, setTopicIdMap] = useState(() => ({ ...initialTopicMap }));

    useEffect(() => {
        const query = url.includes('?') ? url.split('?')[1] : '';
        const params = new URLSearchParams(query);
        const topic = params.get('topic');
        const workspaceParam = params.get('workspace');

        if (topic) {
            setSelectedTopic(topic);
        } else if (url === '/workspaces' || url === '/workspaces/') {
            setSelectedTopic('Semua');
        }

        if (workspaceParam) {
            const wsId = parseInt(workspaceParam, 10);
            setActiveWorkspaceId(!isNaN(wsId) ? wsId : null);
        } else if (topic) {
            setActiveWorkspaceId(null);
        }
    }, [url]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (topicDropdownRef.current && !topicDropdownRef.current.contains(event.target)) {
                setIsTopicDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editContextName, setEditContextName] = useState('');

    const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
    const filteredWorkspaces = workspaces.filter(w => {
        const matchesSearch = w.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTopic = selectedTopic === 'Semua' || w.topic === selectedTopic;
        return matchesSearch && matchesTopic;
    });

    const groupedWorkspaces = useMemo(() => {
        if (!isAllTopicSelected) return null;
        const groups = {};
        filteredWorkspaces.forEach(w => {
            const topic = w.topic || 'Lainnya';
            if (!groups[topic]) groups[topic] = [];
            groups[topic].push(w);
        });
        return groups;
    }, [isAllTopicSelected, filteredWorkspaces]);

    const triggerDelete = (e, type, id, name) => {
        e.preventDefault();
        e.stopPropagation();
        setItemToDelete({ type, id, name });
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        setIsSaving(true);
        const { type, id, name } = itemToDelete;
        try {
            if (type === 'workspace') {
                await axios.delete(`/api/workspaces/${id}`);
                setWorkspaces(prev => prev.filter(w => w.id !== id));
                if (activeWorkspaceId === id) setActiveWorkspaceId(null);
            } else if (type === 'topic') {
                const topicId = topicIdMap[name];
                if (topicId) {
                    await axios.delete(`/api/topics/${topicId}`);
                    setCustomTopics(prev => prev.filter(t => t !== name));
                    setWorkspaces(prev => prev.filter(w => w.topic !== name));
                    if (selectedTopic === name) setSelectedTopic('Semua');
                }
            } else if (type === 'chat') {
                await axios.delete(`/api/chat-sessions/${id}`);
                setWorkspaces(prev => prev.map(w => {
                    if (w.id === activeWorkspaceId) {
                        return { ...w, chats: w.chats.filter(c => c.id !== id) };
                    }
                    return w;
                }));
            }
        } catch { }
        setIsSaving(false);
        setItemToDelete(null);
    };

    const handleCreateWorkspace = async (e) => {
        e.preventDefault();
        const trimmedTitle = newWorkspaceName.trim();
        if (!trimmedTitle) {
            setWorkspaceError('Nama folder tidak boleh kosong.');
            return;
        }

        if (trimmedTitle.length > 50) {
            setWorkspaceError('Nama folder terlalu panjang (maksimal 50 karakter).');
            return;
        }

        setWorkspaceError('');
        setWorkspaceTopicError('');

        let topicToUse = selectedTopic;
        if (isAllTopicSelected) {
            const trimmedDropdownTopic = dropdownSelectedTopic.trim();
            if (!trimmedDropdownTopic) {
                setWorkspaceTopicError('Topik wajib dipilih.');
                return;
            }
            topicToUse = trimmedDropdownTopic;
        }

        if (!topicToUse || topicToUse === 'Semua') {
            setWorkspaceTopicError('Topik wajib dipilih.');
            return;
        }

        const resolvedTopicId = topicIdMap[topicToUse];
        if (!resolvedTopicId) {
            setWorkspaceTopicError('Topik tidak ditemukan. Silakan buat topik terlebih dahulu.');
            return;
        }

        setIsSaving(true);
        try {
            const response = await axios.post('/api/workspaces', {
                title: trimmedTitle,
                topic_id: resolvedTopicId,
            });
            setWorkspaces(prev => [...prev, response.data]);
            setNewWorkspaceName('');
            setDropdownSelectedTopic('');
            setWorkspaceError('');
            setWorkspaceTopicError('');
            setIsAddWorkspaceModalOpen(false);
        } catch (error) {
            const msg = error.response?.data?.message || 'Gagal membuat folder.';
            setWorkspaceError(msg);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateTopic = async (e) => {
        e.preventDefault();
        const trimmedTopic = newTopicName.trim();
        if (!trimmedTopic) return;

        if (trimmedTopic.length > 50) {
            setTopicError('Topik terlalu panjang (maksimal 50 karakter).');
            return;
        }

        if (allTopics.includes(trimmedTopic)) {
            setSelectedTopic(trimmedTopic);
            setNewTopicName('');
            setIsAddTopicModalOpen(false);
            return;
        }

        setIsSaving(true);
        try {
            const response = await axios.post('/api/topics', { name: trimmedTopic });
            setCustomTopics(prev => [...prev, trimmedTopic]);
            setTopicIdMap(prev => ({ ...prev, [trimmedTopic]: response.data.id }));
            setSelectedTopic(trimmedTopic);
            setNewTopicName('');
            setTopicError('');
            setIsAddTopicModalOpen(false);
        } catch (error) {
            const msg = error.response?.data?.message || 'Gagal membuat topik.';
            setTopicError(msg);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateChat = async () => {
        if (!activeWorkspace) return;
        setIsSaving(true);
        try {
            const response = await axios.post(`/api/workspaces/${activeWorkspace.id}/chat`);
            router.visit(response.data.redirect_url);
        } catch {
            setIsSaving(false);
        }
    };

    const handleCloseWorkspaceModal = () => {
        setIsAddWorkspaceModalOpen(false);
        setWorkspaceError('');
        setWorkspaceTopicError('');
        setNewWorkspaceName('');
        setDropdownSelectedTopic('');
    };

    const handleStartEditTitle = (e) => {
        e.stopPropagation();
        setEditContextName(activeWorkspace.title);
        setIsEditingTitle(true);
    };

    const handleSaveTitle = async () => {
        if (!editContextName.trim()) {
            setIsEditingTitle(false);
            return;
        }
        try {
            await axios.put(`/api/workspaces/${activeWorkspace.id}`, {
                title: editContextName.trim(),
            });
            const updatedWorkspaces = workspaces.map(w => {
                if (w.id === activeWorkspace.id) {
                    return { ...w, title: editContextName.trim() };
                }
                return w;
            });
            setWorkspaces(updatedWorkspaces);
        } catch {
        }
        setIsEditingTitle(false);
    };

    const headerContent = (
        <Breadcrumbs
            items={activeWorkspaceId ? [
                { label: 'Ruang Kerja', onClick: () => setActiveWorkspaceId(null) },
                activeWorkspace?.topic ? {
                    label: activeWorkspace.topic,
                    onClick: () => {
                        setSelectedTopic(activeWorkspace.topic);
                        setActiveWorkspaceId(null);
                    }
                } : null,
                { label: activeWorkspace?.title || 'Memuat...' }
            ].filter(Boolean) : [
                { label: 'Beranda', href: '/' },
                { label: 'Ruang Kerja' }
            ]}
        />
    );

    return (
        <AppLayout header={headerContent} topics={allTopics}>
            <Head title="Ruang Kerja - KeyLearn" />

            <div className="max-w-6xl mx-auto px-4 sm:px-8 mt-6 pb-20">
                {!activeWorkspaceId ? (
                    <div>
                        <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
                            <div>
                                <h2 className="text-2xl font-semibold text-[#5a3e22] mb-1">Ruang Kerja</h2>
                                <p className="text-[#8c7a66] text-sm">Pilih folder materi untuk mulai belajar.</p>
                            </div>
                            <button
                                onClick={() => {
                                    setDropdownSelectedTopic('');
                                    setWorkspaceError('');
                                    setWorkspaceTopicError('');
                                    setIsAddWorkspaceModalOpen(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[#a67c52] text-white hover:bg-[#8b6640] transition-colors focus:outline-none shadow-sm"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                Folder Baru
                            </button>
                        </div>

                        <div className="mb-8">
                            <div className="relative max-w-md mb-5">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b8a28a] pointer-events-none">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                                </svg>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Cari folder materi..."
                                    className="w-full bg-[#fdfbf8] border border-[#d4b896] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#4a3728] placeholder-[#b8a28a] focus:outline-none focus:ring-2 focus:ring-[#a67c52] focus:border-[#a67c52] transition-all shadow-sm"
                                />
                            </div>

                            <div className="relative" ref={topicDropdownRef}>
                                <button
                                    onClick={() => setIsTopicDropdownOpen(prev => !prev)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all focus:outline-none ${isTopicDropdownOpen
                                        ? 'bg-[#fdfbf8] border-[#a67c52] ring-2 ring-[#a67c52]/20 text-[#4a3728]'
                                        : 'bg-[#fdfbf8] border-[#d4b896] text-[#4a3728] hover:border-[#b8926a]'
                                        } shadow-sm`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4 text-[#a67c52]">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                                    </svg>
                                    <span>Topik: {selectedTopic.length > 15 ? selectedTopic.substring(0, 15) + '...' : selectedTopic}</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className={`w-3.5 h-3.5 text-[#8c7a66] transition-transform duration-200 ${isTopicDropdownOpen ? 'rotate-180' : ''}`}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                    </svg>
                                </button>

                                {isTopicDropdownOpen && (
                                    <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-xl border border-[#e0d3c3] shadow-lg z-30 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="max-h-60 overflow-y-auto py-1">
                                            {allTopics.map(topic => (
                                                <div key={topic} className="group/item flex items-center">
                                                    <button
                                                        title={topic}
                                                        onClick={() => {
                                                            setSelectedTopic(topic);
                                                            setIsTopicDropdownOpen(false);
                                                        }}
                                                        className={`flex-1 text-left px-4 py-2.5 text-sm transition-colors ${selectedTopic === topic
                                                            ? 'bg-[#f5efe8] text-[#5a3e22] font-semibold'
                                                            : 'text-[#6b5a47] hover:bg-[#faf7f2]'
                                                            }`}
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            {selectedTopic === topic && (
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3.5 h-3.5 text-[#a67c52]">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                                                </svg>
                                                            )}
                                                            <span className={selectedTopic !== topic ? 'ml-5.5' : ''}>{topic.length > 25 ? topic.substring(0, 25) + '...' : topic}</span>
                                                        </span>
                                                    </button>
                                                    {topic !== 'Semua' && (
                                                        <button
                                                            onClick={(e) => {
                                                                triggerDelete(e, 'topic', null, topic);
                                                                setIsTopicDropdownOpen(false);
                                                            }}
                                                            className="p-1.5 mr-2 rounded-lg text-gray-300 opacity-0 group-hover/item:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all focus:outline-none"
                                                            title="Hapus topik"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="border-t border-[#e8ddd0] p-2">
                                            <button
                                                onClick={() => {
                                                    setIsTopicDropdownOpen(false);
                                                    setIsAddTopicModalOpen(true);
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-[#a67c52] hover:bg-[#f5efe8] transition-colors focus:outline-none"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                                </svg>
                                                Topik Baru
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {isAllTopicSelected && groupedWorkspaces ? (
                            <div className="space-y-10">
                                {Object.keys(groupedWorkspaces).length === 0 && (
                                    <div className="w-full py-16 flex flex-col items-center justify-center text-center">
                                        <p className="text-[#8c7a66] text-sm">
                                            {searchQuery ? 'Tidak ada folder yang cocok.' : 'Belum ada folder.'}
                                        </p>
                                    </div>
                                )}
                                {Object.entries(groupedWorkspaces).map(([topicName, topicWorkspaces]) => (
                                    <div key={topicName}>
                                        <div className="flex items-center gap-3 mb-4">
                                            <h3 className="text-xs font-semibold text-[#8c7a66] uppercase tracking-widest">{topicName}</h3>
                                            <div className="flex-1 h-px bg-[#e8ddd0]"></div>
                                            <span className="text-xs text-[#b8a28a]">{topicWorkspaces.length} folder</span>
                                        </div>
                                        <div className="flex flex-wrap gap-6">
                                            {topicWorkspaces.map((workspace) => (
                                                <div key={workspace.id} className="relative group">
                                                    <button
                                                        title={`Folder: ${workspace.title}${workspace.topic ? `\nTopik: ${workspace.topic}` : ''}`}
                                                        onClick={() => setActiveWorkspaceId(workspace.id)}
                                                        className="w-44 h-44 bg-[#fdfbf8] rounded-2xl border-2 border-[#d4b896] flex flex-col items-center justify-center p-5 hover:border-[#b8926a] hover:shadow-md transition-all cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-[#d4b896]/40"
                                                    >
                                                        <div className="mb-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                                            {icons.folder}
                                                        </div>
                                                        <span className="text-center text-sm font-medium text-[#6b5a47] group-hover:text-[#4a3728] leading-tight transition-colors mb-1 break-words">
                                                            {workspace.title.length > 20 ? workspace.title.substring(0, 20) + '...' : workspace.title}
                                                        </span>
                                                    </button>
                                                    <button
                                                        onClick={(e) => triggerDelete(e, 'workspace', workspace.id, workspace.title)}
                                                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/80 text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all focus:outline-none shadow-sm"
                                                        title="Hapus folder"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-6">
                                {filteredWorkspaces.map((workspace) => (
                                    <div key={workspace.id} className="relative group">
                                        <button
                                            title={`Folder: ${workspace.title}${workspace.topic ? `\nTopik: ${workspace.topic}` : ''}`}
                                            onClick={() => setActiveWorkspaceId(workspace.id)}
                                            className="w-44 h-44 bg-[#fdfbf8] rounded-2xl border-2 border-[#d4b896] flex flex-col items-center justify-center p-5 hover:border-[#b8926a] hover:shadow-md transition-all cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-[#d4b896]/40"
                                        >
                                            <div className="mb-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                                {icons.folder}
                                            </div>
                                            <span className="text-center text-sm font-medium text-[#6b5a47] group-hover:text-[#4a3728] leading-tight transition-colors mb-1 break-words">
                                                {workspace.title.length > 20 ? workspace.title.substring(0, 20) + '...' : workspace.title}
                                            </span>
                                            {workspace.topic && (
                                                <span className="text-[10px] font-semibold text-[#b8a28a] uppercase tracking-wider text-center break-words">
                                                    {workspace.topic.length > 20 ? workspace.topic.substring(0, 20) + '...' : workspace.topic}
                                                </span>
                                            )}
                                        </button>
                                        <button
                                            onClick={(e) => triggerDelete(e, 'workspace', workspace.id, workspace.title)}
                                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/80 text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all focus:outline-none shadow-sm"
                                            title="Hapus folder"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}

                                {filteredWorkspaces.length === 0 && (
                                    <div className="w-full py-16 flex flex-col items-center justify-center text-center">
                                        <p className="text-[#8c7a66] text-sm">
                                            {searchQuery ? 'Tidak ada folder yang cocok.' : 'Belum ada folder.'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-4 mb-8">
                            <button
                                onClick={() => setActiveWorkspaceId(null)}
                                className="p-2 -ml-2 text-[#8c7a66] hover:text-[#5a3e22] hover:bg-[#e8ddd0] rounded-lg transition-colors focus:outline-none"
                            >
                                {icons.back}
                            </button>

                            {isEditingTitle ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        autoFocus
                                        type="text"
                                        value={editContextName}
                                        onChange={(e) => setEditContextName(e.target.value)}
                                        onBlur={handleSaveTitle}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                                        className="bg-white border border-gray-200 rounded-xl px-4 py-2 font-semibold text-2xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-300 w-80"
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 group">
                                    <h2 className="text-2xl font-semibold text-[#5a3e22] select-none" onDoubleClick={handleStartEditTitle}>
                                        {activeWorkspace.title}
                                    </h2>
                                    <button
                                        onClick={handleStartEditTitle}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 focus:outline-none"
                                    >
                                        {icons.edit}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <button
                                onClick={handleCreateChat}
                                disabled={isSaving}
                                className="h-28 bg-[#fdfbf8]/60 rounded-2xl border border-dashed border-[#c9b89e] flex items-center justify-center text-[#a08b73] hover:bg-[#fdfbf8] hover:border-[#a67c52] hover:text-[#6b4c2a] transition-all gap-2 text-sm font-medium focus:outline-none disabled:opacity-50"
                            >
                                {icons.plus} Obrolan Baru
                            </button>

                            {activeWorkspace.chats.map((chat) => (
                                <Link
                                    key={chat.id}
                                    href={`/workspaces/${activeWorkspace.id}/chat/${chat.id}`}
                                    className="group/chat relative h-28 bg-[#fdfbf8] rounded-2xl border border-[#e0d3c3] p-5 hover:border-[#c4a882] hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between"
                                >
                                    <h4 className="font-medium text-[#5a3e22]">
                                        {chat.title}
                                    </h4>
                                    <div className="flex items-center justify-between text-[#b8a28a] text-xs">
                                        <span>{chat.updated_at ? new Date(chat.updated_at).toLocaleDateString('id-ID') : 'Hari ini'}</span>
                                        {icons.message}
                                    </div>
                                    <button
                                        onClick={(e) => triggerDelete(e, 'chat', chat.id, chat.title)}
                                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/80 text-gray-400 opacity-0 group-hover/chat:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all focus:outline-none shadow-sm"
                                        title="Hapus obrolan"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <Transition appear show={isAddWorkspaceModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={handleCloseWorkspaceModal}>
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
                                        Folder Baru
                                    </Dialog.Title>
                                    <div className="mb-6">
                                        <p className="text-sm text-[#8c7a66]">
                                            Beri nama untuk ruang belajar yang baru.
                                        </p>
                                    </div>

                                    <form onSubmit={handleCreateWorkspace}>
                                        <div className="space-y-4">
                                            <div>
                                                <input
                                                    type="text"
                                                    value={newWorkspaceName}
                                                    onChange={(e) => {
                                                        setNewWorkspaceName(e.target.value);
                                                        if (workspaceError) setWorkspaceError('');
                                                    }}
                                                    placeholder="Nama materi..."
                                                    className={`w-full bg-[#faf7f2] border ${workspaceError ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : 'border-[#ddd0c0] focus:ring-[#c4a882] focus:border-[#c4a882]'} rounded-xl px-4 py-3 text-[#4a3728] focus:outline-none focus:ring-2 transition-all`}
                                                    autoFocus
                                                />
                                                {workspaceError && (
                                                    <p className="mt-2 text-sm text-red-500 font-medium">
                                                        {workspaceError}
                                                    </p>
                                                )}
                                            </div>
                                            {isAllTopicSelected && (
                                                <div className="relative">
                                                    <select
                                                        value={dropdownSelectedTopic}
                                                        required
                                                        onChange={(e) => {
                                                            setDropdownSelectedTopic(e.target.value);
                                                            if (workspaceTopicError) setWorkspaceTopicError('');
                                                        }}
                                                        className={`w-full bg-[#faf7f2] bg-none border ${workspaceTopicError ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : 'border-[#ddd0c0] focus:ring-[#c4a882] focus:border-[#c4a882]'} rounded-xl pl-4 pr-10 py-3 text-[#4a3728] focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer font-medium`}
                                                    >
                                                        <option value="" disabled>Pilih Topik...</option>
                                                        {selectableTopics.map(t => (
                                                            <option key={t} value={t}>{t}</option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-[#a67c52]">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </div>
                                                    {workspaceTopicError && (
                                                        <p className="mt-2 text-sm text-red-500 font-medium">
                                                            {workspaceTopicError}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-8 flex justify-end gap-3">
                                            <button
                                                type="button"
                                                onClick={handleCloseWorkspaceModal}
                                                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors focus:outline-none"
                                            >
                                                Batal
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={!newWorkspaceName.trim() || (isAllTopicSelected && !dropdownSelectedTopic.trim()) || workspaceError || workspaceTopicError || (isAllTopicSelected && selectableTopics.length === 0) || isSaving}
                                                className="px-6 py-2.5 rounded-xl text-sm font-medium bg-[#a67c52] text-white hover:bg-[#8b6640] disabled:opacity-40 transition-colors focus:outline-none"
                                            >
                                                {isSaving ? 'Menyimpan...' : 'Simpan'}
                                            </button>
                                        </div>
                                    </form>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            <Transition appear show={isAddTopicModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setIsAddTopicModalOpen(false)}>
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
                                        Topik Baru
                                    </Dialog.Title>
                                    <div className="mb-6">
                                        <p className="text-sm text-[#8c7a66]">
                                            Buat kategori topik baru untuk ruang belajar Anda.
                                        </p>
                                    </div>

                                    <form onSubmit={handleCreateTopic}>
                                        <div>
                                            <input
                                                type="text"
                                                value={newTopicName}
                                                onChange={(e) => {
                                                    setNewTopicName(e.target.value);
                                                    if (topicError) setTopicError('');
                                                }}
                                                placeholder="Nama topik..."
                                                className={`w-full bg-[#faf7f2] border ${topicError ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : 'border-[#ddd0c0] focus:ring-[#c4a882] focus:border-[#c4a882]'} rounded-xl px-4 py-3 text-[#4a3728] focus:outline-none focus:ring-2 transition-all`}
                                                autoFocus
                                            />
                                            {topicError && (
                                                <p className="mt-2 text-sm text-red-500 font-medium">
                                                    {topicError}
                                                </p>
                                            )}
                                        </div>

                                        <div className="mt-8 flex justify-end gap-3">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsAddTopicModalOpen(false);
                                                    setTopicError('');
                                                    setNewTopicName('');
                                                }}
                                                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors focus:outline-none"
                                            >
                                                Batal
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={!newTopicName.trim() || isSaving}
                                                className="px-6 py-2.5 rounded-xl text-sm font-medium bg-[#a67c52] text-white hover:bg-[#8b6640] disabled:opacity-40 transition-colors focus:outline-none"
                                            >
                                                {isSaving ? 'Menyimpan...' : 'Simpan'}
                                            </button>
                                        </div>
                                    </form>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
            <Transition appear show={!!itemToDelete} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setItemToDelete(null)}>
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
                                        Pindahkan ke Tong Sampah?
                                    </Dialog.Title>
                                    <div className="mb-6">
                                        <p className="text-sm text-[#8c7a66]">
                                            <strong className="text-[#5a3e22]">{itemToDelete?.name}</strong> akan dipindahkan ke Tong Sampah. Anda masih bisa memulihkannya nanti.
                                        </p>
                                    </div>
                                    <div className="flex justify-end gap-3">
                                        <button
                                            onClick={() => setItemToDelete(null)}
                                            className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors focus:outline-none"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            onClick={confirmDelete}
                                            disabled={isSaving}
                                            className="px-6 py-2.5 rounded-xl text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 disabled:opacity-50 transition-colors focus:outline-none"
                                        >
                                            {isSaving ? 'Memproses...' : 'Ya, hapus'}
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
