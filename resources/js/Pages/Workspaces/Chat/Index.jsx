import React, { useEffect, useRef, useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import Breadcrumbs from '@/Components/Breadcrumbs';
import axios from 'axios';


// Model options moved inside component to ensure fresh render

export default function Index({ workspace, chat, allTopics = [] }) {
    const [messages, setMessages] = useState(chat.messages || []);
    const [input, setInput] = useState('');
    const [chatTitle, setChatTitle] = useState(chat.title);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editTitleInput, setEditTitleInput] = useState(chat.title);
    const [isLoading, setIsLoading] = useState(false);
    const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
    const modelOptions = [
        { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
        { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
        { value: 'google/gemini-2.0-flash-lite-001:free', label: 'Gemini 2.0 Lite' },
    ];

    const [selectedModel, setSelectedModel] = useState(modelOptions[0].value);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadError, setUploadError] = useState('');
    const [copiedId, setCopiedId] = useState(null);
    const fileInputRef = useRef(null);
    const timeoutIdsRef = useRef([]);

    useEffect(() => {
        return () => {
            timeoutIdsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
            timeoutIdsRef.current = [];
        };
    }, []);

    const handleTitleSave = async () => {
        const trimmed = editTitleInput.trim();
        if (trimmed && trimmed.length <= 50) {
            setChatTitle(trimmed);
            try {
                await axios.put(`/api/chat-sessions/${chat.id}`, { title: trimmed });
            } catch {
            }
        } else {
            setEditTitleInput(chatTitle);
        }
        setIsEditingTitle(false);
    };

    const handleCopy = async (msg) => {
        try {
            await navigator.clipboard.writeText(msg.content);
            setCopiedId(msg.id);
            const timeoutId = setTimeout(() => {
                setCopiedId(null);
                timeoutIdsRef.current = timeoutIdsRef.current.filter((id) => id !== timeoutId);
            }, 2000);
            timeoutIdsRef.current.push(timeoutId);
        } catch { }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const sendMessage = async (content, fileToSend, retryMsgId = null) => {
        const userMsg = {
            id: retryMsgId || Date.now(),
            role: 'user',
            content: content,
            attachment: fileToSend ? {
                name: fileToSend.name,
                size: fileToSend.size,
            } : null,
            error: null,
            _file: fileToSend || null,
        };

        if (retryMsgId) {
            setMessages(prev => prev.map(m =>
                m.id === retryMsgId ? { ...m, error: null } : m
            ));
        } else {
            setMessages(prev => [...prev, userMsg]);
        }

        setIsLoading(true);

        try {
            const formData = new FormData();
            formData.append('model', selectedModel);

            if (content) {
                formData.append('message', content);
            }

            if (fileToSend) {
                formData.append('file', fileToSend);
            }

            const response = await axios.post(`/api/chat/${chat.id}/message`, formData);

            if (response.data.user_message) {
                setMessages(prev => {
                    const filtered = prev.filter(m => m.id !== userMsg.id);
                    return [...filtered, {
                        id: response.data.user_message.id,
                        role: response.data.user_message.role,
                        content: response.data.user_message.content,
                        attachment: userMsg.attachment,
                        error: null,
                        _file: null,
                    }];
                });
            }

            const aiMsg = {
                id: response.data.ai_message?.id || Date.now() + 1,
                role: 'assistant',
                content: response.data.reply,
            };
            setMessages(prev => [...prev, aiMsg]);

        } catch (error) {
            let errorMessage = 'Gagal mengirim pesan.';
            const responseData = error.response?.data;
            if (responseData?.reply) {
                errorMessage = responseData.reply;
            } else if (responseData?.errors) {
                const firstErrorGroup = Object.values(responseData.errors)[0];
                if (Array.isArray(firstErrorGroup) && firstErrorGroup[0]) {
                    errorMessage = firstErrorGroup[0];
                }
            }

            setMessages(prev => prev.map(m =>
                m.id === userMsg.id ? { ...m, error: errorMessage } : m
            ));

            // Auto-delete failed message after 10 seconds
            const timeoutId = setTimeout(() => {
                setMessages(prev => prev.filter(m => m.id !== userMsg.id || !m.error));
                timeoutIdsRef.current = timeoutIdsRef.current.filter((id) => id !== timeoutId);
            }, 10000);
            timeoutIdsRef.current.push(timeoutId);
        } finally {
            setIsLoading(false);
        }
    };

    const textareaRef = useRef(null);

    const adjustHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        const trimmed = input.trim();
        if ((!trimmed && !selectedFile) || isLoading) return;

        const fileToSend = selectedFile;
        setInput('');
        setUploadError('');
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }

        // Reset height
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        await sendMessage(trimmed, fileToSend);
    };

    const handleRetry = (msg) => {
        if (isLoading) return;
        sendMessage(msg.content, msg._file || null, msg.id);
    };

    const handleDeleteMessage = (id) => {
        setMessages(prev => prev.filter(m => m.id !== id));
    };

    const handleAttachClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        if (!isPdf) {
            setUploadError('Hanya file PDF yang didukung.');
            setSelectedFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            return;
        }

        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            setUploadError('Ukuran PDF maksimal 10MB.');
            setSelectedFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            return;
        }

        setUploadError('');
        setSelectedFile(file);
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const headerContent = (
        <Breadcrumbs
            items={[
                { label: 'Ruang Kerja', href: '/workspaces' },
                workspace.topic ? {
                    label: workspace.topic,
                    href: `/workspaces?topic=${encodeURIComponent(workspace.topic)}`
                } : null,
                {
                    label: workspace.title,
                    href: workspace.topic
                        ? `/workspaces?topic=${encodeURIComponent(workspace.topic)}&workspace=${workspace.id}`
                        : `/workspaces?workspace=${workspace.id}`
                },
                {
                    label: isEditingTitle ? (
                        <input
                            type="text"
                            value={editTitleInput}
                            onChange={(e) => setEditTitleInput(e.target.value)}
                            onBlur={handleTitleSave}
                            onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                            className="bg-transparent border-b border-[#a67c52] text-gray-800 font-semibold focus:outline-none focus:border-[#8b6640] px-0 py-0 w-32 focus:ring-0"
                            autoFocus
                            maxLength={50}
                        />
                    ) : (
                        <span
                            className="flex items-center gap-1.5 group cursor-pointer"
                            title={chatTitle}
                            onClick={() => {
                                setIsEditingTitle(true);
                                setEditTitleInput(chatTitle);
                            }}
                        >
                            <span>{chatTitle.length > 20 ? chatTitle.substring(0, 20) + '...' : chatTitle}</span>
                            <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#a67c52] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5z" />
                            </svg>
                        </span>
                    )
                }
            ].filter(Boolean)}
        />
    );

    const isEmpty = messages.length === 0;

    return (
        <AppLayout header={headerContent} topics={allTopics} isChatLayout={true}>
            <Head title={`${chatTitle} - KeyLearn`} />

            <div className="flex flex-col flex-1 h-full w-full relative">

                <div className="flex-1 overflow-y-auto w-full [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#e0d3c3] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#c4a882] transition-colors">
                    <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
                        {isEmpty ? (
                            <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
                                <h1 className="text-2xl sm:text-3xl font-semibold text-[#5a3e22] mb-2 text-center">
                                    Apa yang bisa saya bantu?
                                </h1>
                                <p className="text-[#8c7a66] text-sm text-center max-w-md">
                                    Ketik pertanyaan tentang materi Anda di bawah ini.
                                </p>
                            </div>
                        ) : (
                            <>
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`flex items-end gap-2 max-w-[85%] md:max-w-[70%] lg:max-w-[60%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                            <div className={`relative ${msg.role === 'assistant' ? 'group/copy' : ''}`}>
                                                <div
                                                    className={`flex flex-col gap-3 px-5 py-4 sm:px-6 sm:py-5 text-[0.95rem] leading-relaxed border transition-all ${msg.role === 'user'
                                                        ? `bg-[#f2efe8] text-[#4a3728] rounded-[24px] rounded-br-[8px] ${msg.error ? 'border-[#ef4444]/40' : 'border-transparent'}`
                                                        : 'bg-white text-[#4a3728] border-[#e8ddd0] rounded-[24px] rounded-bl-[8px]'
                                                        }`}
                                                >
                                                    {msg.attachment && (
                                                        <div className="flex flex-col gap-3 w-full min-w-0">
                                                            <div className="font-bold text-[1.05rem] sm:text-[1.1rem] text-[#4a3728] uppercase tracking-wide truncate max-w-[220px] sm:max-w-[280px] md:max-w-[340px] xl:max-w-[400px]">
                                                                {msg.attachment.name.replace(/\.pdf$/i, '')}
                                                            </div>

                                                            <div className="inline-flex items-center self-start rounded-2xl border border-[#dcd0c0] bg-transparent px-2 py-[0.35rem] gap-3">
                                                                <div className="bg-[#ef4444] text-white text-[0.65rem] font-bold px-2 py-1.5 rounded-lg leading-none">
                                                                    PDF
                                                                </div>
                                                                <div className="flex items-center gap-1.5 pr-3">
                                                                    <span className="text-sm font-semibold text-[#4a3728]">PDF</span>
                                                                    <span className="text-sm text-[#8c7a66]">{formatFileSize(msg.attachment.size)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {msg.content && <div>{msg.content}</div>}
                                                </div>

                                                {msg.role === 'assistant' && msg.content && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopy(msg)}
                                                        className="absolute -bottom-3 right-3 flex items-center justify-center w-7 h-7 rounded-lg bg-white border border-[#e0d3c3] text-[#8c7a66] shadow-sm opacity-0 group-hover/copy:opacity-100 transition-all duration-200 hover:bg-[#f5f0ea] hover:text-[#5a3e22] hover:border-[#c4a882] focus:outline-none focus:opacity-100"
                                                        title="Salin teks"
                                                    >
                                                        {copiedId === msg.id ? (
                                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-[#22c55e]">
                                                                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                                            </svg>
                                                        ) : (
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                )}
                                            </div>

                                            {msg.role === 'user' && msg.error && (
                                                <div className="flex flex-col items-center gap-1 shrink-0 pb-1">
                                                    <div className="group relative">
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-[#ef4444] cursor-pointer">
                                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                                        </svg>
                                                        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-[#4a3728] text-white text-xs rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-lg">
                                                            {msg.error}
                                                            <div className="absolute top-full right-2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-[#4a3728]" />
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRetry(msg)}
                                                        disabled={isLoading}
                                                        className="flex items-center justify-center w-5 h-5 rounded-full text-[#8c7a66] hover:text-[#a67c52] hover:bg-[#f2efe8] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                        title="Coba lagi"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                                            <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H4.598a.75.75 0 00-.75.75v3.634a.75.75 0 001.5 0v-2.033l.312.311a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm-9.576-3.287l-.312.31a7 7 0 0111.712 3.138.75.75 0 001.449-.39 8.5 8.5 0 00-14.213-3.82l-.312.312V5.25a.75.75 0 00-1.5 0v3.634a.75.75 0 00.75.75h3.634a.75.75 0 000-1.5H5.424l.312-.31z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteMessage(msg.id)}
                                                        className="flex items-center justify-center w-5 h-5 rounded-full text-[#8c7a66] hover:text-[#ef4444] hover:bg-[#fef2f2] transition-colors"
                                                        title="Hapus"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                                            <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75V4H5a2 2 0 00-2 2v.25a.75.75 0 001.5 0V6a.5.5 0 01.5-.5h10a.5.5 0 01.5.5v.25a.75.75 0 001.5 0V6a2 2 0 00-2-2h-1V3.75A2.75 2.75 0 0011.25 1h-2.5zM5 7.25a.75.75 0 01.75.75v8.5a.25.25 0 00.25.25h8a.25.25 0 00.25-.25V8a.75.75 0 011.5 0v8.5A1.75 1.75 0 0113.75 18H6.25A1.75 1.75 0 014.5 16.25V8a.75.75 0 01.75-.75z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="max-w-[85%] md:max-w-[70%] lg:max-w-[60%] px-6 py-5 bg-white border border-[#e8ddd0] rounded-[24px] rounded-bl-[8px] flex items-center gap-1.5 h-[4.5rem]">
                                            <div className="w-1.5 h-1.5 bg-[#a67c52] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-1.5 h-1.5 bg-[#c4a882] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="w-1.5 h-1.5 bg-[#e0d3c3] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <div className="shrink-0 pb-6 pt-2 w-full max-w-4xl mx-auto px-4 sm:px-6">
                    {selectedFile && (
                        <div className="mb-3 px-1">
                            <div className="group relative inline-flex items-center gap-3 rounded-2xl border border-[#e0d3c3] bg-white p-2 pr-5 shadow-sm transition-all hover:border-[#c4a882] hover:shadow-md">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fef2f2] text-[#ef4444]">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                                        <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625z" />
                                        <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
                                    </svg>
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="max-w-[14rem] truncate text-[0.9rem] font-semibold text-[#4a3728] sm:max-w-[20rem]" title={selectedFile.name}>
                                        {selectedFile.name}
                                    </span>
                                    <span className="text-[0.75rem] font-medium text-[#8c7a66]">
                                        PDF • {formatFileSize(selectedFile.size)}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleRemoveFile}
                                    className="absolute -right-2.5 -top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#8c7a66] shadow-sm border border-[#e0d3c3] opacity-0 transition-all hover:bg-[#ef4444] hover:text-white hover:border-[#ef4444] hover:shadow-md group-hover:opacity-100 focus:opacity-100 focus:outline-none"
                                    title="Hapus lampiran"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-3.5 w-3.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}

                    {uploadError && (
                        <p className="mb-2 text-sm text-red-500">{uploadError}</p>
                    )}

                    <form
                        onSubmit={handleSend}
                        className="relative flex items-end gap-2 bg-[#f5f0ea] rounded-2xl border border-[#e0d3c3] px-2 py-1.5 transition-all focus-within:border-[#c4a882] focus-within:ring-2 focus-within:ring-[#c4a882]/30"
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="application/pdf,.pdf"
                            onChange={handleFileChange}
                            className="hidden"
                        />

                        {isModelMenuOpen && (
                            <div className="absolute bottom-full left-0 mb-4 w-[28rem] bg-white rounded-2xl p-5 border border-[#e0d3c3] z-50">
                                <h3 className="text-[#5a3e22] text-[1.15rem] font-medium mb-4">Pilih Otak AI untuk ruang kerja ini.</h3>
                                <div className="relative mb-5">
                                    <select
                                        value={selectedModel}
                                        onChange={(e) => setSelectedModel(e.target.value)}
                                        className="w-full bg-[#f5f0ea] bg-none border border-[#e0d3c3] text-[#4a3728] text-[0.95rem] rounded-xl pl-4 pr-12 py-3.5 appearance-none leading-tight focus:outline-none focus:border-[#c4a882] cursor-pointer"
                                    >
                                        {modelOptions.map((model) => (
                                            <option key={model.value} value={model.value}>{model.label}</option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center text-[#8c7a66]">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                        </svg>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsModelMenuOpen(false)}
                                    className="w-full bg-[#a67c52] text-white font-medium text-[1.05rem] rounded-xl py-3 hover:bg-[#8b6640] transition-colors focus:outline-none"
                                >
                                    Gunakan model ini
                                </button>
                            </div>
                        )}

                        <div className="flex items-center gap-1 mb-0.5">
                            <button
                                type="button"
                                onClick={handleAttachClick}
                                className="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl text-[#8c7a66] hover:bg-[#e8ddd0] hover:text-[#5a3e22] transition-colors focus:outline-none"
                                title="Lampirkan file"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                                className={`shrink-0 flex items-center justify-center w-9 h-9 rounded-xl transition-colors focus:outline-none ${isModelMenuOpen ? 'bg-[#e8ddd0] text-[#5a3e22]' : 'text-[#8c7a66] hover:bg-[#e8ddd0] hover:text-[#5a3e22]'}`}
                                title="Pilih Model AI"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                                    <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"></path>
                                    <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"></path>
                                    <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"></path>
                                    <path d="M17.599 6.5a3 3 0 0 0 .399-1.375"></path>
                                    <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"></path>
                                    <path d="M3.477 10.896a4 4 0 0 1 .585-.396"></path>
                                    <path d="M19.938 10.5a4 4 0 0 1 .585.396"></path>
                                    <path d="M6 18a4 4 0 0 1-1.967-.516"></path>
                                    <path d="M19.967 17.484A4 4 0 0 1 18 18"></path>
                                </svg>
                            </button>
                        </div>

                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => {
                                setInput(e.target.value);
                                adjustHeight();
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend(e);
                                }
                            }}
                            placeholder={isLoading ? "Sedang memikirkan jawaban..." : "Tanyakan sesuatu..."}
                            disabled={isLoading}
                            rows={1}
                            className="flex-1 bg-transparent border-none text-sm text-[#4a3728] placeholder-[#b8a28a] focus:outline-none focus:ring-0 py-2.5 px-1 disabled:opacity-50 resize-none min-h-[44px] max-h-[200px] leading-relaxed [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#e0d3c3] [&::-webkit-scrollbar-thumb]:rounded-full"
                        />

                        <button
                            type="submit"
                            disabled={(!input.trim() && !selectedFile) || isLoading}
                            className="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-[#a67c52] text-white hover:bg-[#8b6640] disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none mb-0.5"
                            title="Kirim pesan"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                            </svg>
                        </button>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
