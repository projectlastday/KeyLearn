import React, { useState, useEffect, useRef, Fragment, useMemo } from 'react';
import { Head, usePage } from '@inertiajs/react';
import { Dialog, Transition } from '@headlessui/react';
import AppLayout from '@/Layouts/AppLayout';
import Breadcrumbs from '@/Components/Breadcrumbs';
import WhiteboardWidget from '@/Components/WhiteboardWidget';
import axios from 'axios';
import { renderNoteMarkdown } from '@/Utils/noteMarkdown';

const widgetTypeConfig = {
    note: {
        label: 'Catatan',
        createTitle: 'Buat Catatan',
        helper: 'Masukkan nama untuk catatan baru.',
        placeholder: 'Nama catatan...',
        defaultTitle: 'Catatan Baru',
        errorMessage: 'Gagal membuat catatan.',
    },
    chat: {
        label: 'Obrolan',
        createTitle: 'Buat Obrolan',
        helper: 'Masukkan nama untuk obrolan baru.',
        placeholder: 'Nama obrolan...',
        defaultTitle: 'Obrolan Baru',
        errorMessage: 'Gagal membuat obrolan.',
    },
    reminder: {
        label: 'Pengingat',
        createTitle: 'Buat Pengingat',
        helper: 'Masukkan nama untuk widget pengingat baru.',
        placeholder: 'Nama pengingat...',
        defaultTitle: 'Pengingat Baru',
        errorMessage: 'Gagal membuat pengingat.',
    },
    todo: {
        label: 'To-Do',
        createTitle: 'Buat To-Do',
        helper: 'Masukkan nama untuk widget to-do baru.',
        placeholder: 'Nama to-do...',
        defaultTitle: 'To-Do Baru',
        errorMessage: 'Gagal membuat to-do.',
    },
    timer: {
        label: 'Timer',
        createTitle: 'Buat Timer',
        helper: 'Masukkan nama untuk widget timer baru.',
        placeholder: 'Nama timer...',
        defaultTitle: 'Timer Baru',
        errorMessage: 'Gagal membuat timer.',
    },
    whiteboard: {
        label: 'Whiteboard',
        createTitle: 'Buat Whiteboard',
        helper: 'Masukkan nama untuk widget whiteboard baru.',
        placeholder: 'Nama whiteboard...',
        defaultTitle: 'Whiteboard Baru',
        errorMessage: 'Gagal membuat whiteboard.',
    },
    youtube: {
        label: 'Video YouTube',
        createTitle: 'Buat Widget YouTube',
        helper: 'Masukkan nama untuk widget video YouTube baru.',
        placeholder: 'Nama video...',
        defaultTitle: 'Video YouTube Baru',
        errorMessage: 'Gagal membuat widget YouTube.',
    },
    pdf: {
        label: 'Dokumen PDF',
        createTitle: 'Buat Widget PDF',
        helper: 'Masukkan nama untuk widget dokumen PDF baru.',
        placeholder: 'Nama dokumen...',
        defaultTitle: 'Dokumen Baru',
        errorMessage: 'Gagal membuat widget PDF.',
    },
};

const widgetTypePickerOptions = [
    {
        key: 'note',
        title: 'Catatan',
        description: 'Tulis ringkasan dan ide penting.',
    },
    {
        key: 'chat',
        title: 'Obrolan',
        description: 'Buat sesi chatbot baru.',
    },
    {
        key: 'reminder',
        title: 'Pengingat',
        description: 'Buat daftar pengingat satu kali.',
    },
    {
        key: 'todo',
        title: 'To-Do',
        description: 'Checklist tugas dengan status.',
    },
    {
        key: 'timer',
        title: 'Timer',
        description: 'Stopwatch belajar: Run, Stop, Reset.',
    },
    {
        key: 'whiteboard',
        title: 'Whiteboard',
        description: 'Papan gambar dengan pena berwarna.',
    },
    {
        key: 'youtube',
        title: 'Video YouTube',
        description: 'Tempel link YouTube lalu tonton di popup modal.',
    },
    {
        key: 'pdf',
        title: 'Dokumen PDF',
        description: 'Upload PDF lalu lihat di widget dan modal.',
    },
];

const noteTextSizeOptions = [
    { key: 'small', label: 'Kecil' },
    { key: 'normal', label: 'Normal' },
    { key: 'large', label: 'Besar' },
];

const noteTextSizeClassMap = {
    small: 'text-sm',
    normal: 'text-base',
    large: 'text-lg',
};

const sortTodoStatuses = (statuses = []) => (
    [...statuses].sort((a, b) => {
        const orderDiff = (a.sort_order || 0) - (b.sort_order || 0);
        if (orderDiff !== 0) return orderDiff;

        return (a.id || 0) - (b.id || 0);
    })
);

const sortTodoItems = (items = []) => (
    [...items].sort((a, b) => {
        const orderDiff = (a.sort_order || 0) - (b.sort_order || 0);
        if (orderDiff !== 0) return orderDiff;

        return (a.id || 0) - (b.id || 0);
    })
);

const createReminderDraft = () => ({
    message: '',
    remindHours: '0',
    remindMinutes: '0',
    remindSeconds: '0',
    sendWhatsapp: true,
});

const sortReminderItems = (items = []) => (
    [...items].sort((a, b) => {
        const aCompleted = Boolean(a.triggered_at);
        const bCompleted = Boolean(b.triggered_at);

        if (aCompleted !== bCompleted) {
            return aCompleted ? 1 : -1;
        }

        const aTimeRaw = new Date(aCompleted ? a.triggered_at || a.remind_at : a.remind_at).getTime();
        const bTimeRaw = new Date(bCompleted ? b.triggered_at || b.remind_at : b.remind_at).getTime();
        const aTime = Number.isNaN(aTimeRaw) ? 0 : aTimeRaw;
        const bTime = Number.isNaN(bTimeRaw) ? 0 : bTimeRaw;

        return aCompleted ? bTime - aTime : aTime - bTime;
    })
);

const splitReminderItems = (items = []) => ({
    upcoming: sortReminderItems(items.filter(item => !item.triggered_at)),
    completed: sortReminderItems(items.filter(item => item.triggered_at)),
});

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

const formatCountdown = (diffMs) => {
    const safeDiff = Math.max(0, diffMs);
    const totalSeconds = Math.floor(safeDiff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds]
        .map((value) => String(value).padStart(2, '0'))
        .join(':');
};

const formatStopwatchSeconds = (totalSecondsRaw) => {
    const totalSeconds = Math.max(0, Math.floor(totalSecondsRaw || 0));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds]
        .map((value) => String(value).padStart(2, '0'))
        .join(':');
};

const clampDurationPart = (value, max) => {
    const numeric = Number.parseInt(String(value ?? ''), 10);

    if (Number.isNaN(numeric) || numeric < 0) return 0;
    if (numeric > max) return max;

    return numeric;
};

const durationToTotalSeconds = ({ remindHours, remindMinutes, remindSeconds }) => {
    const hours = clampDurationPart(remindHours, 99);
    const minutes = clampDurationPart(remindMinutes, 59);
    const seconds = clampDurationPart(remindSeconds, 59);

    return (hours * 3600) + (minutes * 60) + seconds;
};

const splitSecondsToDuration = (totalSeconds) => {
    const safeSeconds = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;

    return {
        remindHours: String(hours),
        remindMinutes: String(minutes),
        remindSeconds: String(seconds),
    };
};

const sanitizeDurationInput = (rawValue, max) => {
    const digitsOnly = String(rawValue ?? '').replace(/\D/g, '');
    if (digitsOnly === '') return '0';

    return String(clampDurationPart(digitsOnly, max));
};

const getReminderOriginalDurationSeconds = (item) => {
    if (!item?.remind_at) return 1;

    const targetAtMs = new Date(item.remind_at).getTime();
    const anchorAtMsRaw = new Date(
        item.updated_at
        || item.created_at
        || item.remind_at
    ).getTime();
    const anchorAtMs = Number.isNaN(anchorAtMsRaw) ? targetAtMs : anchorAtMsRaw;
    const durationMs = Math.max(1000, targetAtMs - anchorAtMs);

    return Math.max(1, Math.floor(durationMs / 1000));
};

const getWibDateTimeParts = (date) => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const partValue = (type) => parts.find((part) => part.type === type)?.value || '00';

    return {
        remindDate: `${partValue('year')}-${partValue('month')}-${partValue('day')}`,
        remindTime: `${partValue('hour')}:${partValue('minute')}:${partValue('second')}`,
    };
};

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
    bell: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" className="w-5 h-5 text-[#b8977a]">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9a6 6 0 10-12 0v.05c0 .237 0 .472.002.7a8.967 8.967 0 01-2.31 6.022 23.848 23.848 0 005.454 1.31m5.711 0a24.255 24.255 0 01-5.711 0m5.711 0a3 3 0 11-5.711 0" />
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
    const normalizedInitialWorkspaces = useMemo(() => (
        safeInitialWorkspaces.map((workspace) => ({
            ...workspace,
            widgets: (workspace.widgets || []).map((widget) => ({
                ...widget,
                reminders: sortReminderItems(widget.reminders || []),
                todo_statuses: sortTodoStatuses(widget.todo_statuses || []),
                todo_items: sortTodoItems(widget.todo_items || []),
            })),
        }))
    ), [safeInitialWorkspaces]);
    const [workspaces, setWorkspaces] = useState(normalizedInitialWorkspaces);
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
    const [topicModalMode, setTopicModalMode] = useState('create');
    const [editingTopicId, setEditingTopicId] = useState(null);
    const [editingTopicOriginalName, setEditingTopicOriginalName] = useState('');
    const [isWidgetModalOpen, setIsWidgetModalOpen] = useState(false);
    const [widgetModalStep, setWidgetModalStep] = useState(null);
    const [newWidgetType, setNewWidgetType] = useState('note');
    const [newWorkspaceName, setNewWorkspaceName] = useState('');
    const [workspaceError, setWorkspaceError] = useState('');
    const [workspaceTopicError, setWorkspaceTopicError] = useState('');
    const [newTopicName, setNewTopicName] = useState('');
    const [newWidgetTitle, setNewWidgetTitle] = useState(widgetTypeConfig.note.defaultTitle);
    const [widgetError, setWidgetError] = useState('');
    const [topicError, setTopicError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTopic, setSelectedTopic] = useState('Semua');
    const [dropdownSelectedTopic, setDropdownSelectedTopic] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [draggedWidgetId, setDraggedWidgetId] = useState(null);
    const [dragOverWidgetId, setDragOverWidgetId] = useState(null);
    const [hasDragChanges, setHasDragChanges] = useState(false);
    const [isReorderSaving, setIsReorderSaving] = useState(false);
    const [reorderError, setReorderError] = useState('');
    const isAllTopicSelected = selectedTopic === 'Semua';
    const selectableTopics = useMemo(
        () => allTopics.filter((topic) => topic !== 'Semua'),
        [allTopics]
    );

    const [itemToDelete, setItemToDelete] = useState(null);
    const [topicIdMap, setTopicIdMap] = useState(() => ({ ...initialTopicMap }));
    const [todoErrors, setTodoErrors] = useState({});
    const [todoLoading, setTodoLoading] = useState({});
    const [todoDraftByWidget, setTodoDraftByWidget] = useState({});
    const [todoStatusDraftByWidget, setTodoStatusDraftByWidget] = useState({});
    const [todoAddModal, setTodoAddModal] = useState({ open: false, widgetId: null });
    const [todoEditingItemByWidget, setTodoEditingItemByWidget] = useState({});
    const [todoEditDraftByItem, setTodoEditDraftByItem] = useState({});
    const [reminderErrors, setReminderErrors] = useState({});
    const [reminderLoading, setReminderLoading] = useState({});
    const [timerErrors, setTimerErrors] = useState({});
    const [timerLoading, setTimerLoading] = useState({});
    const [stoppedCountdownByWidget, setStoppedCountdownByWidget] = useState({});
    const [countdownTargetOverrideByWidget, setCountdownTargetOverrideByWidget] = useState({});
    const [countdownNow, setCountdownNow] = useState(Date.now());
    const [reminderModal, setReminderModal] = useState({ open: false, widgetId: null, itemId: null });
    const [reminderForm, setReminderForm] = useState(createReminderDraft());
    const [reminderModalError, setReminderModalError] = useState('');
    const [reminderModalSaving, setReminderModalSaving] = useState(false);
    const [whiteboardModal, setWhiteboardModal] = useState({ open: false, widgetId: null });
    const [youtubeLinkModal, setYoutubeLinkModal] = useState({ open: false, widgetId: null });
    const [noteModal, setNoteModal] = useState({ open: false, widgetId: null, tab: 'edit' });
    const [noteSaveStateByWidget, setNoteSaveStateByWidget] = useState({});
    const [youtubeDraftByWidget, setYoutubeDraftByWidget] = useState({});
    const [youtubeErrorByWidget, setYoutubeErrorByWidget] = useState({});
    const [youtubeLoadingByWidget, setYoutubeLoadingByWidget] = useState({});
    const [pdfModal, setPdfModal] = useState({ open: false, widgetId: null });
    const [pdfErrorByWidget, setPdfErrorByWidget] = useState({});
    const [pdfLoadingByWidget, setPdfLoadingByWidget] = useState({});
    const noteSaveTimeoutsRef = useRef({});
    const latestActiveWidgetsRef = useRef([]);
    const dragOriginWidgetIdRef = useRef(null);
    const lastDragOverWidgetIdRef = useRef(null);
    const preDragWidgetsRef = useRef([]);
    const widgetTitleInputRef = useRef(null);
    const topicNameInputRef = useRef(null);
    const workspaceTitleInputRef = useRef(null);
    const reminderMessageInputRef = useRef(null);

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

    useEffect(() => {
        return () => {
            Object.values(noteSaveTimeoutsRef.current).forEach((timeoutId) => clearTimeout(timeoutId));
            noteSaveTimeoutsRef.current = {};
        };
    }, []);

    useEffect(() => {
        const timerId = window.setInterval(() => {
            setCountdownNow(Date.now());
        }, 1000);

        return () => window.clearInterval(timerId);
    }, []);

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editContextName, setEditContextName] = useState('');
    const widgetRowSpanMap = {
        S: 9,
        M: 12,
        L: 16,
    };
    const reminderRowSpanMap = {
        S: 15,
        M: 16,
        L: 20,
    };
    const todoRowSpanMap = {
        S: 16,
        M: 18,
        L: 22,
    };
    const nextWidgetSizeMap = {
        S: 'M',
        M: 'L',
        L: 'S',
    };

    useEffect(() => {
        setWorkspaces(normalizedInitialWorkspaces);
    }, [normalizedInitialWorkspaces]);

    const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
    const activeWorkspaceWidgets = [...(activeWorkspace?.widgets || [])]
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const activeNoteWidget = useMemo(() => (
        activeWorkspaceWidgets.find((widget) => widget.id === noteModal.widgetId) || null
    ), [activeWorkspaceWidgets, noteModal.widgetId]);
    const activePdfWidget = useMemo(() => (
        activeWorkspaceWidgets.find((widget) => widget.id === pdfModal.widgetId) || null
    ), [activeWorkspaceWidgets, pdfModal.widgetId]);
    const activeWhiteboardWidget = useMemo(() => (
        activeWorkspaceWidgets.find((widget) => widget.id === whiteboardModal.widgetId) || null
    ), [activeWorkspaceWidgets, whiteboardModal.widgetId]);
    const activeYoutubeLinkWidget = useMemo(() => (
        activeWorkspaceWidgets.find((widget) => widget.id === youtubeLinkModal.widgetId) || null
    ), [activeWorkspaceWidgets, youtubeLinkModal.widgetId]);
    useEffect(() => {
        latestActiveWidgetsRef.current = activeWorkspaceWidgets;
    }, [activeWorkspaceWidgets]);

    useEffect(() => {
        if (!noteModal.open) return;
        if (!activeNoteWidget || activeNoteWidget.type !== 'note') {
            flushPendingNoteSave(noteModal.widgetId);
            setNoteModal({ open: false, widgetId: null, tab: 'edit' });
        }
    }, [noteModal.open, activeNoteWidget]);
    useEffect(() => {
        if (!pdfModal.open) return;
        if (!activePdfWidget || activePdfWidget.type !== 'pdf') {
            setPdfModal((prev) => ({ ...prev, open: false }));
        }
    }, [pdfModal.open, activePdfWidget]);
    useEffect(() => {
        if (!whiteboardModal.open) return;
        if (!activeWhiteboardWidget || activeWhiteboardWidget.type !== 'whiteboard') {
            setWhiteboardModal((prev) => ({ ...prev, open: false }));
        }
    }, [whiteboardModal.open, activeWhiteboardWidget]);
    useEffect(() => {
        if (!youtubeLinkModal.open) return;
        if (!activeYoutubeLinkWidget || activeYoutubeLinkWidget.type !== 'youtube') {
            setYoutubeLinkModal((prev) => ({ ...prev, open: false }));
        }
    }, [youtubeLinkModal.open, activeYoutubeLinkWidget]);
    useEffect(() => {
        if (!isWidgetModalOpen || widgetModalStep !== 'detail') return;

        window.requestAnimationFrame(() => {
            if (!widgetTitleInputRef.current) return;
            widgetTitleInputRef.current.focus();
            widgetTitleInputRef.current.select();
        });
    }, [isWidgetModalOpen, widgetModalStep, newWidgetType]);
    useEffect(() => {
        if (!isAddTopicModalOpen || topicModalMode !== 'edit') return;

        window.requestAnimationFrame(() => {
            if (!topicNameInputRef.current) return;
            topicNameInputRef.current.focus();
            topicNameInputRef.current.select();
        });
    }, [isAddTopicModalOpen, topicModalMode]);
    useEffect(() => {
        if (!isEditingTitle) return;

        window.requestAnimationFrame(() => {
            if (!workspaceTitleInputRef.current) return;
            workspaceTitleInputRef.current.focus();
            workspaceTitleInputRef.current.select();
        });
    }, [isEditingTitle]);
    useEffect(() => {
        if (!reminderModal.open || !reminderModal.itemId) return;

        window.requestAnimationFrame(() => {
            if (!reminderMessageInputRef.current) return;
            reminderMessageInputRef.current.focus();
            reminderMessageInputRef.current.select();
        });
    }, [reminderModal.open, reminderModal.itemId]);

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
    const currentNoteSaveState = noteModal.widgetId
        ? noteSaveStateByWidget[noteModal.widgetId]
        : null;

    const buildWorkspaceUrl = (topicName, workspaceId = null) => {
        const params = new URLSearchParams();
        if (topicName && topicName !== 'Semua') {
            params.set('topic', topicName);
        }
        if (workspaceId) {
            params.set('workspace', String(workspaceId));
        }
        const query = params.toString();
        return query ? `/workspaces?${query}` : '/workspaces';
    };

    const openWorkspaceView = (workspace) => {
        setActiveWorkspaceId(workspace.id);
        window.history.pushState({}, '', buildWorkspaceUrl(workspace.topic || selectedTopic, workspace.id));
        axios.post(`/api/workspaces/${workspace.id}/open`).catch(() => { });
    };

    const closeWorkspaceView = () => {
        const topicForList = activeWorkspace?.topic || selectedTopic;
        setActiveWorkspaceId(null);
        window.history.pushState({}, '', buildWorkspaceUrl(topicForList));
    };

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
                if (activeWorkspaceId === id) closeWorkspaceView();
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
                        return {
                            ...w,
                            chats: (w.chats || []).filter(c => c.id !== id),
                            widgets: (w.widgets || []).filter(widget => widget.chat_session_id !== id),
                        };
                    }
                    return w;
                }));
            } else if (type === 'widget') {
                await axios.delete(`/api/widgets/${id}`);
                setWorkspaces(prev => prev.map(w => {
                    if (w.id === activeWorkspaceId) {
                        return { ...w, widgets: (w.widgets || []).filter(widget => widget.id !== id) };
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

    const openCreateTopicModal = () => {
        setTopicModalMode('create');
        setEditingTopicId(null);
        setEditingTopicOriginalName('');
        setNewTopicName('');
        setTopicError('');
        setIsAddTopicModalOpen(true);
    };

    const openEditTopicModal = (topicName) => {
        if (!topicName || topicName === 'Semua') return;

        const topicId = topicIdMap[topicName];
        if (!topicId) return;

        setTopicModalMode('edit');
        setEditingTopicId(topicId);
        setEditingTopicOriginalName(topicName);
        setNewTopicName(topicName);
        setTopicError('');
        setIsAddTopicModalOpen(true);
    };

    const closeTopicModal = () => {
        setIsAddTopicModalOpen(false);
        setTopicModalMode('create');
        setEditingTopicId(null);
        setEditingTopicOriginalName('');
        setNewTopicName('');
        setTopicError('');
    };

    const handleSubmitTopicModal = async (e) => {
        e.preventDefault();
        const trimmedTopic = newTopicName.trim();
        if (!trimmedTopic) return;

        if (trimmedTopic.length > 50) {
            setTopicError('Topik terlalu panjang (maksimal 50 karakter).');
            return;
        }

        if (topicModalMode === 'create' && allTopics.includes(trimmedTopic)) {
            setSelectedTopic(trimmedTopic);
            closeTopicModal();
            return;
        }

        setIsSaving(true);
        try {
            if (topicModalMode === 'edit') {
                if (!editingTopicId) {
                    setTopicError('Topik tidak ditemukan.');
                    return;
                }

                if (trimmedTopic === editingTopicOriginalName) {
                    closeTopicModal();
                    return;
                }

                const response = await axios.put(`/api/topics/${editingTopicId}`, { name: trimmedTopic });
                const updatedTopicName = response.data.name || trimmedTopic;

                setCustomTopics(prev => Array.from(new Set(
                    prev.map((topic) => (topic === editingTopicOriginalName ? updatedTopicName : topic))
                )));
                setTopicIdMap((prev) => {
                    const next = { ...prev };
                    delete next[editingTopicOriginalName];
                    next[updatedTopicName] = response.data.id;
                    return next;
                });
                setWorkspaces((prev) => prev.map((workspace) => (
                    workspace.topic === editingTopicOriginalName
                        ? { ...workspace, topic: updatedTopicName }
                        : workspace
                )));
                setSelectedTopic((prev) => (
                    prev === editingTopicOriginalName ? updatedTopicName : prev
                ));
            } else {
                const response = await axios.post('/api/topics', { name: trimmedTopic });
                setCustomTopics(prev => [...prev, trimmedTopic]);
                setTopicIdMap(prev => ({ ...prev, [trimmedTopic]: response.data.id }));
                setSelectedTopic(trimmedTopic);
            }

            closeTopicModal();
        } catch (error) {
            const msg = error.response?.data?.message || 'Gagal membuat topik.';
            setTopicError(msg);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateWidget = async (e) => {
        e.preventDefault();
        if (!activeWorkspace) return;

        const trimmedTitle = newWidgetTitle.trim();
        if (!trimmedTitle) {
            setWidgetError('Nama tidak boleh kosong.');
            return;
        }
        if (trimmedTitle.length > 100) {
            setWidgetError('Nama terlalu panjang (maksimal 100 karakter).');
            return;
        }

        setIsSaving(true);
        setWidgetError('');
        try {
            const response = await axios.post('/api/widgets', {
                workspace_id: activeWorkspace.id,
                type: newWidgetType,
                title: trimmedTitle,
                size_preset: 'M',
            });
            setWorkspaces(prev => prev.map(w => {
                if (w.id === activeWorkspace.id) {
                    return {
                        ...w,
                        widgets: [
                            ...(w.widgets || []),
                            {
                                ...response.data,
                                reminders: sortReminderItems(response.data.reminders || []),
                                todo_statuses: sortTodoStatuses(response.data.todo_statuses || []),
                                todo_items: sortTodoItems(response.data.todo_items || []),
                            },
                        ],
                    };
                }
                return w;
            }));
            setIsWidgetModalOpen(false);
        } catch (error) {
            const msg = error.response?.data?.message || widgetTypeConfig[newWidgetType]?.errorMessage || 'Gagal membuat widget.';
            setWidgetError(msg);
        } finally {
            setIsSaving(false);
        }
    };

    const handleChooseWidgetType = (type) => {
        setNewWidgetType(type);
        setWidgetError('');
        setNewWidgetTitle(widgetTypeConfig[type]?.defaultTitle || widgetTypeConfig.note.defaultTitle);
        setWidgetModalStep('detail');
    };

    const handleCloseWidgetCreation = () => {
        setIsWidgetModalOpen(false);
    };

    const handleBackToWidgetSelection = () => {
        setWidgetModalStep('select');
        setWidgetError('');
    };

    const handleOpenWidgetCreation = () => {
        setWidgetModalStep('select');
        setIsWidgetModalOpen(true);
        setWidgetError('');
    };

    const handleWidgetModalAfterLeave = () => {
        setWidgetModalStep(null);
        setWidgetError('');
        setNewWidgetType('note');
        setNewWidgetTitle(widgetTypeConfig.note.defaultTitle);
    };

    const handleSaveWidgetTitle = async (widgetId, titleValue) => {
        const trimmed = titleValue.trim();
        if (!trimmed) return;
        try {
            await axios.put(`/api/widgets/${widgetId}`, { title: trimmed });
            setWorkspaces(prev => prev.map(w => {
                if (w.id !== activeWorkspaceId) return w;
                return {
                    ...w,
                    widgets: (w.widgets || []).map(widget => (
                        widget.id === widgetId ? { ...widget, title: trimmed } : widget
                    )),
                };
            }));
        } catch {
        }
    };

    const handleResizeWidget = async (widgetId, sizePreset) => {
        try {
            const response = await axios.post('/api/widgets/resize', {
                widget_id: widgetId,
                size_preset: sizePreset,
            });
            setWorkspaces(prev => prev.map(w => {
                if (w.id !== activeWorkspaceId) return w;
                return {
                    ...w,
                    widgets: (w.widgets || []).map(widget => (
                        widget.id === widgetId ? { ...widget, ...response.data } : widget
                    )),
                };
            }));
        } catch {
        }
    };

    const handleCycleWidgetSize = (widget) => {
        const currentSize = widget.size_preset || 'M';
        const nextSize = nextWidgetSizeMap[currentSize] || 'M';
        handleResizeWidget(widget.id, nextSize);
    };

    const persistWidgetReorder = async (widgets) => {
        if (!activeWorkspace) return;
        await axios.post('/api/widgets/reorder', {
            workspace_id: activeWorkspace.id,
            widgets: widgets.map((widget, index) => ({
                id: widget.id,
                sort_order: index + 1,
                grid_x: 1,
                grid_y: index + 1,
            })),
        });
    };

    const moveWidgetLocally = (targetWidgetId) => {
        if (!activeWorkspace || !draggedWidgetId || draggedWidgetId === targetWidgetId) return;
        if (lastDragOverWidgetIdRef.current === targetWidgetId) return;

        const fromIndex = activeWorkspaceWidgets.findIndex((widget) => widget.id === draggedWidgetId);
        const toIndex = activeWorkspaceWidgets.findIndex((widget) => widget.id === targetWidgetId);
        if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

        const reordered = [...activeWorkspaceWidgets];
        const [moved] = reordered.splice(fromIndex, 1);
        reordered.splice(toIndex, 0, moved);
        const normalized = reordered.map((widget, index) => ({
            ...widget,
            sort_order: index + 1,
            grid_x: 1,
            grid_y: index + 1,
        }));

        setWorkspaces(prev => prev.map((workspace) => (
            workspace.id === activeWorkspace.id
                ? { ...workspace, widgets: normalized }
                : workspace
        )));
        setHasDragChanges(true);
        lastDragOverWidgetIdRef.current = targetWidgetId;
    };

    const setNoteSaveState = (widgetId, status, message = '') => {
        setNoteSaveStateByWidget((prev) => ({
            ...prev,
            [widgetId]: { status, message },
        }));
    };

    const updateNoteLocally = (widgetId, patch) => {
        setWorkspaces((prev) => prev.map((workspace) => {
            if (workspace.id !== activeWorkspaceId) return workspace;

            return {
                ...workspace,
                widgets: (workspace.widgets || []).map((widget) => (
                    widget.id === widgetId
                        ? {
                            ...widget,
                            note: {
                                ...(widget.note || {}),
                                ...patch,
                            },
                        }
                        : widget
                )),
            };
        }));
    };

    const persistNote = async (widgetId) => {
        const targetWidget = latestActiveWidgetsRef.current.find((widget) => widget.id === widgetId);
        const content = targetWidget?.note?.content ?? '';
        const textSize = targetWidget?.note?.text_size || 'normal';

        setNoteSaveState(widgetId, 'saving');
        try {
            const response = await axios.put(`/api/widget-notes/${widgetId}`, {
                content,
                text_size: textSize,
            });
            updateNoteLocally(widgetId, {
                content: response.data.content ?? '',
                text_size: response.data.text_size || textSize,
            });
            setNoteSaveState(widgetId, 'saved');
        } catch {
            setNoteSaveState(widgetId, 'error', 'Gagal menyimpan catatan.');
        }
    };

    const scheduleNoteSave = (widgetId) => {
        if (noteSaveTimeoutsRef.current[widgetId]) {
            clearTimeout(noteSaveTimeoutsRef.current[widgetId]);
        }

        noteSaveTimeoutsRef.current[widgetId] = setTimeout(() => {
            persistNote(widgetId);
            delete noteSaveTimeoutsRef.current[widgetId];
        }, 700);
    };

    const flushPendingNoteSave = (widgetId) => {
        if (!widgetId) return;
        if (noteSaveTimeoutsRef.current[widgetId]) {
            clearTimeout(noteSaveTimeoutsRef.current[widgetId]);
            delete noteSaveTimeoutsRef.current[widgetId];
            persistNote(widgetId);
        }
    };

    const handleNoteContentChange = (widgetId, content) => {
        updateNoteLocally(widgetId, { content });
        scheduleNoteSave(widgetId);
    };

    const handleNoteTextSizeChange = (widgetId, textSize) => {
        updateNoteLocally(widgetId, { text_size: textSize });
        scheduleNoteSave(widgetId);
    };

    const openNoteModal = (widgetId) => {
        setNoteModal({ open: true, widgetId, tab: 'edit' });
    };

    const closeNoteModal = () => {
        flushPendingNoteSave(noteModal.widgetId);
        setNoteModal({ open: false, widgetId: null, tab: 'edit' });
    };

    const setYoutubeError = (widgetId, message = '') => {
        setYoutubeErrorByWidget((prev) => {
            if (!message) {
                const next = { ...prev };
                delete next[widgetId];
                return next;
            }

            return { ...prev, [widgetId]: message };
        });
    };

    const setYoutubeLoadingState = (widgetId, value) => {
        setYoutubeLoadingByWidget((prev) => {
            if (!value) {
                const next = { ...prev };
                delete next[widgetId];
                return next;
            }

            return { ...prev, [widgetId]: true };
        });
    };

    const updateYoutubeWidgetData = (widgetId, youtubeData) => {
        setWorkspaces((prev) => prev.map((workspace) => {
            if (workspace.id !== activeWorkspaceId) return workspace;

            return {
                ...workspace,
                widgets: (workspace.widgets || []).map((widget) => (
                    widget.id === widgetId
                        ? { ...widget, youtube: youtubeData }
                        : widget
                )),
            };
        }));
    };

    const handleYoutubeDraftChange = (widgetId, value) => {
        setYoutubeDraftByWidget((prev) => ({
            ...prev,
            [widgetId]: value,
        }));
        setYoutubeError(widgetId, '');
    };

    const handleYoutubeLinkSave = async (widget, { closeOnSuccess = false } = {}) => {
        const widgetId = widget.id;
        const draft = String(
            youtubeDraftByWidget[widgetId]
            ?? widget.youtube?.source_url
            ?? ''
        ).trim();

        if (!draft) {
            setYoutubeError(widgetId, 'Link YouTube tidak boleh kosong.');
            return;
        }

        setYoutubeLoadingState(widgetId, true);
        setYoutubeError(widgetId, '');
        try {
            const response = await axios.put(`/api/widget-youtubes/${widgetId}`, {
                url: draft,
            });
            updateYoutubeWidgetData(widgetId, response.data.youtube);
            setYoutubeDraftByWidget((prev) => ({
                ...prev,
                [widgetId]: response.data.youtube?.source_url || draft,
            }));
            if (closeOnSuccess) {
                closeYoutubeLinkModal();
            }
        } catch (error) {
            const message = error.response?.data?.message || 'Gagal menyimpan link YouTube.';
            setYoutubeError(widgetId, message);
        } finally {
            setYoutubeLoadingState(widgetId, false);
        }
    };

    const openYoutubeLinkModal = (widget) => {
        if (!widget) return;
        setYoutubeDraftByWidget((prev) => ({
            ...prev,
            [widget.id]: prev[widget.id] ?? widget.youtube?.source_url ?? '',
        }));
        setYoutubeError(widget.id, '');
        setYoutubeLinkModal({ open: true, widgetId: widget.id });
    };

    const closeYoutubeLinkModal = () => {
        setYoutubeLinkModal((prev) => ({ ...prev, open: false }));
    };

    const handleYoutubeLinkModalAfterLeave = () => {
        setYoutubeLinkModal({ open: false, widgetId: null });
    };

    const setPdfError = (widgetId, message = '') => {
        setPdfErrorByWidget((prev) => {
            if (!message) {
                const next = { ...prev };
                delete next[widgetId];
                return next;
            }

            return { ...prev, [widgetId]: message };
        });
    };

    const setPdfLoadingState = (widgetId, value) => {
        setPdfLoadingByWidget((prev) => {
            if (!value) {
                const next = { ...prev };
                delete next[widgetId];
                return next;
            }

            return { ...prev, [widgetId]: true };
        });
    };

    const updatePdfWidgetData = (widgetId, updater) => {
        setWorkspaces((prev) => prev.map((workspace) => {
            if (workspace.id !== activeWorkspaceId) return workspace;

            return {
                ...workspace,
                widgets: (workspace.widgets || []).map((widget) => {
                    if (widget.id !== widgetId) return widget;

                    const nextPdf = updater(widget.pdf || null);
                    return {
                        ...widget,
                        pdf: nextPdf,
                    };
                }),
            };
        }));
    };

    const handlePdfUpload = async (widgetId, file) => {
        if (!file) return;
        const isPdf = file.type === 'application/pdf' || String(file.name || '').toLowerCase().endsWith('.pdf');
        if (!isPdf) {
            setPdfError(widgetId, 'Hanya file PDF yang didukung.');
            return;
        }
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            setPdfError(widgetId, 'Ukuran PDF maksimal 10MB.');
            return;
        }

        setPdfLoadingState(widgetId, true);
        setPdfError(widgetId, '');
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await axios.post(`/api/widget-pdfs/${widgetId}/file`, formData);
            updatePdfWidgetData(widgetId, () => response.data);
        } catch (error) {
            const message = error.response?.data?.errors?.file?.[0]
                || error.response?.data?.message
                || 'Gagal mengunggah PDF.';
            setPdfError(widgetId, message);
        } finally {
            setPdfLoadingState(widgetId, false);
        }
    };

    const openPdfModal = (widget) => {
        if (!widget?.pdf?.has_file) return;
        setPdfModal({ open: true, widgetId: widget.id });
    };

    const closePdfModal = () => {
        setPdfModal((prev) => ({ ...prev, open: false }));
    };

    const handlePdfModalAfterLeave = () => {
        setPdfModal({ open: false, widgetId: null });
    };

    const openWhiteboardModal = (widgetId) => {
        setWhiteboardModal({ open: true, widgetId });
    };

    const closeWhiteboardModal = () => {
        setWhiteboardModal((prev) => ({ ...prev, open: false }));
    };

    const handleWhiteboardModalAfterLeave = () => {
        setWhiteboardModal({ open: false, widgetId: null });
    };

    const setTodoError = (widgetId, message = '') => {
        setTodoErrors((prev) => {
            if (!message) {
                const next = { ...prev };
                delete next[widgetId];
                return next;
            }

            return { ...prev, [widgetId]: message };
        });
    };

    const setTodoLoadingState = (key, value) => {
        setTodoLoading((prev) => {
            if (!value) {
                const next = { ...prev };
                delete next[key];
                return next;
            }

            return { ...prev, [key]: true };
        });
    };

    const updateTodoWidgetData = (widgetId, updater) => {
        setWorkspaces((prev) => prev.map((workspace) => {
            if (workspace.id !== activeWorkspaceId) return workspace;

            return {
                ...workspace,
                widgets: (workspace.widgets || []).map((widget) => {
                    if (widget.id !== widgetId) return widget;

                    const nextData = updater(widget);

                    return {
                        ...widget,
                        ...nextData,
                        todo_statuses: sortTodoStatuses(nextData.todo_statuses ?? widget.todo_statuses ?? []),
                        todo_items: sortTodoItems(nextData.todo_items ?? widget.todo_items ?? []),
                    };
                }),
            };
        }));
    };

    const handleTodoItemDraftChange = (widgetId, value) => {
        setTodoDraftByWidget((prev) => ({
            ...prev,
            [widgetId]: value,
        }));
        setTodoError(widgetId, '');
    };

    const handleTodoStatusDraftChange = (widgetId, value) => {
        setTodoStatusDraftByWidget((prev) => ({
            ...prev,
            [widgetId]: value,
        }));
        setTodoError(widgetId, '');
    };

    const getTodoStatusByName = (widget, name) => (
        sortTodoStatuses(widget.todo_statuses || []).find(
            (status) => String(status.name || '').toLowerCase() === String(name || '').toLowerCase()
        ) || null
    );

    const handleCreateTodoItem = async (widget) => {
        const draft = (todoDraftByWidget[widget.id] || '').trim();
        if (!draft) {
            setTodoError(widget.id, 'Isi tugas tidak boleh kosong.');
            return false;
        }

        const loadingKey = `todo-item-create-${widget.id}`;
        setTodoLoadingState(loadingKey, true);

        try {
            const defaultStatus = getTodoStatusByName(widget, 'belum') || sortTodoStatuses(widget.todo_statuses || [])[0] || null;
            const payload = {
                content: draft,
                status_id: defaultStatus?.id,
            };

            const response = await axios.post(`/api/widget-todos/${widget.id}/items`, payload);
            updateTodoWidgetData(widget.id, (currentWidget) => ({
                todo_items: [...(currentWidget.todo_items || []), response.data],
            }));
            setTodoDraftByWidget((prev) => ({ ...prev, [widget.id]: '' }));
            setTodoError(widget.id, '');
            return true;
        } catch (errorResponse) {
            const message = errorResponse.response?.data?.message || 'Gagal menambah tugas.';
            setTodoError(widget.id, message);
            return false;
        } finally {
            setTodoLoadingState(loadingKey, false);
        }
    };

    const openTodoAddModal = (widgetId) => {
        setTodoDraftByWidget((prev) => ({ ...prev, [widgetId]: '' }));
        setTodoError(widgetId, '');
        setTodoAddModal({ open: true, widgetId });
    };

    const closeTodoAddModal = () => {
        setTodoAddModal({ open: false, widgetId: null });
    };

    const handleSubmitTodoAddModal = async (e) => {
        e.preventDefault();
        if (!todoAddModal.widgetId) return;

        const widget = activeWorkspaceWidgets.find((current) => current.id === todoAddModal.widgetId);
        if (!widget) return;

        const created = await handleCreateTodoItem(widget);
        if (created) {
            closeTodoAddModal();
        }
    };

    const handleCreateTodoStatus = async (widget) => {
        const draft = (todoStatusDraftByWidget[widget.id] || '').trim();
        if (!draft) {
            setTodoError(widget.id, 'Nama status tidak boleh kosong.');
            return;
        }

        const loadingKey = `todo-status-create-${widget.id}`;
        setTodoLoadingState(loadingKey, true);

        try {
            const response = await axios.post(`/api/widget-todos/${widget.id}/statuses`, {
                name: draft,
            });

            updateTodoWidgetData(widget.id, (currentWidget) => ({
                todo_statuses: [...(currentWidget.todo_statuses || []), response.data],
            }));
            setTodoStatusDraftByWidget((prev) => ({ ...prev, [widget.id]: '' }));
            setTodoError(widget.id, '');
        } catch (errorResponse) {
            const message = errorResponse.response?.data?.message || 'Gagal menambah status.';
            setTodoError(widget.id, message);
        } finally {
            setTodoLoadingState(loadingKey, false);
        }
    };

    const handleUpdateTodoItem = async (widget, itemId, payload) => {
        const loadingKey = `todo-item-update-${itemId}`;
        setTodoLoadingState(loadingKey, true);

        try {
            const response = await axios.put(`/api/widget-todos/items/${itemId}`, payload);
            updateTodoWidgetData(widget.id, (currentWidget) => ({
                todo_items: (currentWidget.todo_items || []).map((item) => (
                    item.id === itemId ? response.data : item
                )),
            }));
            setTodoError(widget.id, '');
        } catch (errorResponse) {
            const message = errorResponse.response?.data?.message || 'Gagal memperbarui tugas.';
            setTodoError(widget.id, message);
        } finally {
            setTodoLoadingState(loadingKey, false);
        }
    };

    const handleDeleteTodoItem = async (widget, itemId) => {
        const loadingKey = `todo-item-delete-${itemId}`;
        setTodoLoadingState(loadingKey, true);

        try {
            await axios.delete(`/api/widget-todos/items/${itemId}`);
            updateTodoWidgetData(widget.id, (currentWidget) => ({
                todo_items: (currentWidget.todo_items || []).filter((item) => item.id !== itemId),
            }));
            setTodoEditDraftByItem((prev) => {
                if (!Object.prototype.hasOwnProperty.call(prev, itemId)) return prev;
                const next = { ...prev };
                delete next[itemId];
                return next;
            });
            setTodoEditingItemByWidget((prev) => (
                prev[widget.id] === itemId
                    ? { ...prev, [widget.id]: null }
                    : prev
            ));
            setTodoError(widget.id, '');
        } catch (errorResponse) {
            const message = errorResponse.response?.data?.message || 'Gagal menghapus tugas.';
            setTodoError(widget.id, message);
        } finally {
            setTodoLoadingState(loadingKey, false);
        }
    };

    const handleStartTodoItemEdit = (widgetId, item) => {
        setTodoEditingItemByWidget((prev) => ({ ...prev, [widgetId]: item.id }));
        setTodoEditDraftByItem((prev) => ({
            ...prev,
            [item.id]: item.content || '',
        }));
    };

    const handleTodoItemEditDraftChange = (itemId, value) => {
        setTodoEditDraftByItem((prev) => ({
            ...prev,
            [itemId]: value,
        }));
    };

    const handleCancelTodoItemEdit = (widgetId, itemId, initialValue) => {
        setTodoEditingItemByWidget((prev) => ({ ...prev, [widgetId]: null }));
        setTodoEditDraftByItem((prev) => ({
            ...prev,
            [itemId]: initialValue || '',
        }));
    };

    const handleFinishTodoItemEdit = async (widget, item) => {
        const rawValue = todoEditDraftByItem[item.id] ?? item.content ?? '';
        const trimmed = rawValue.trim();

        setTodoEditingItemByWidget((prev) => ({ ...prev, [widget.id]: null }));

        if (!trimmed) {
            await handleDeleteTodoItem(widget, item.id);
            return;
        }

        if (trimmed !== item.content) {
            await handleUpdateTodoItem(widget, item.id, { content: trimmed });
        }
    };

    const handleMoveTodoItem = async (widget, itemId, direction) => {
        const items = sortTodoItems(widget.todo_items || []);
        const currentIndex = items.findIndex((item) => item.id === itemId);
        if (currentIndex < 0) return;

        const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (nextIndex < 0 || nextIndex >= items.length) return;

        const reordered = [...items];
        const [moved] = reordered.splice(currentIndex, 1);
        reordered.splice(nextIndex, 0, moved);
        const normalized = reordered.map((item, index) => ({
            ...item,
            sort_order: index + 1,
        }));

        updateTodoWidgetData(widget.id, () => ({
            todo_items: normalized,
        }));

        const loadingKey = `todo-item-reorder-${widget.id}`;
        setTodoLoadingState(loadingKey, true);

        try {
            await axios.post(`/api/widget-todos/${widget.id}/reorder`, {
                items: normalized.map((item) => ({
                    id: item.id,
                    sort_order: item.sort_order,
                })),
            });
            setTodoError(widget.id, '');
        } catch (errorResponse) {
            const message = errorResponse.response?.data?.message || 'Gagal mengurutkan tugas.';
            setTodoError(widget.id, message);
        } finally {
            setTodoLoadingState(loadingKey, false);
        }
    };

    const setReminderError = (key, message = '') => {
        setReminderErrors(prev => {
            if (!message) {
                const next = { ...prev };
                delete next[key];
                return next;
            }

            return { ...prev, [key]: message };
        });
    };

    const setReminderLoadingState = (key, value) => {
        setReminderLoading(prev => {
            if (!value) {
                const next = { ...prev };
                delete next[key];
                return next;
            }

            return { ...prev, [key]: true };
        });
    };

    const updateReminderItems = (widgetId, updater) => {
        setWorkspaces(prev => prev.map((workspace) => {
            if (workspace.id !== activeWorkspaceId) return workspace;

            return {
                ...workspace,
                widgets: (workspace.widgets || []).map((widget) => {
                    if (widget.id !== widgetId) return widget;

                    return {
                        ...widget,
                        reminders: sortReminderItems(updater(widget.reminders || [])),
                    };
                }),
            };
        }));

        setStoppedCountdownByWidget((prev) => {
            if (!Object.prototype.hasOwnProperty.call(prev, widgetId)) return prev;

            const next = { ...prev };
            delete next[widgetId];
            return next;
        });
        setCountdownTargetOverrideByWidget((prev) => {
            if (!Object.prototype.hasOwnProperty.call(prev, widgetId)) return prev;

            const next = { ...prev };
            delete next[widgetId];
            return next;
        });
    };

    const validateReminderInput = ({ message, remindHours, remindMinutes, remindSeconds }) => {
        const trimmedMessage = message.trim();

        if (!trimmedMessage) {
            return 'Isi pengingat tidak boleh kosong.';
        }

        if (trimmedMessage.length > 500) {
            return 'Isi pengingat terlalu panjang (maksimal 500 karakter).';
        }

        const totalSeconds = durationToTotalSeconds({ remindHours, remindMinutes, remindSeconds });
        if (totalSeconds <= 0) {
            return 'Durasi pengingat minimal 1 detik.';
        }

        return '';
    };

    const openCreateReminderModal = (widgetId) => {
        setReminderModal({
            open: true,
            widgetId,
            itemId: null,
        });
        setReminderForm(createReminderDraft());
        setReminderModalError('');
    };

    const openEditReminderModal = (widgetId, item) => {
        setReminderModal({
            open: true,
            widgetId,
            itemId: item.id,
        });
        setReminderForm({
            message: item.message || '',
            ...splitSecondsToDuration(getReminderOriginalDurationSeconds(item)),
            sendWhatsapp: !!item.send_whatsapp,
        });
        setReminderModalError('');
    };

    const closeReminderModal = () => {
        setReminderModal({ open: false, widgetId: null, itemId: null });
        setReminderForm(createReminderDraft());
        setReminderModalError('');
    };

    const handleReminderFormChange = (field, value) => {
        const durationFieldMaxMap = {
            remindHours: 99,
            remindMinutes: 59,
            remindSeconds: 59,
        };

        const nextValue = Object.prototype.hasOwnProperty.call(durationFieldMaxMap, field)
            ? sanitizeDurationInput(value, durationFieldMaxMap[field])
            : value;

        setReminderForm((prev) => ({
            ...prev,
            [field]: nextValue,
        }));
        setReminderModalError('');
    };

    const adjustReminderFormDuration = (field, delta, max) => {
        const currentValue = clampDurationPart(reminderForm[field], max);
        const nextValue = Math.max(0, Math.min(max, currentValue + delta));

        setReminderForm((prev) => ({
            ...prev,
            [field]: String(nextValue),
        }));
        setReminderModalError('');
    };

    const handleSubmitReminderModal = async (e) => {
        e.preventDefault();
        if (!reminderModal.widgetId) return;

        const error = validateReminderInput(reminderForm);
        if (error) {
            setReminderModalError(error);
            return;
        }

        setReminderModalSaving(true);

        try {
            const totalSeconds = durationToTotalSeconds(reminderForm);
            const targetDate = new Date(Date.now() + (totalSeconds * 1000));
            const { remindDate, remindTime } = getWibDateTimeParts(targetDate);
            const payload = {
                message: reminderForm.message.trim(),
                remind_date: remindDate,
                remind_time: remindTime,
                send_whatsapp: reminderForm.sendWhatsapp,
            };

            if (reminderModal.itemId) {
                const response = await axios.put(`/api/widget-reminders/items/${reminderModal.itemId}`, payload);
                updateReminderItems(reminderModal.widgetId, (items) => items.map((currentItem) => (
                    currentItem.id === reminderModal.itemId ? response.data : currentItem
                )));
            } else {
                const response = await axios.post(`/api/widget-reminders/${reminderModal.widgetId}/items`, payload);
                updateReminderItems(reminderModal.widgetId, (items) => [...items, response.data]);
            }

            closeReminderModal();
        } catch (errorResponse) {
            const message = errorResponse.response?.data?.message
                || errorResponse.response?.data?.errors?.remind_time?.[0]
                || 'Gagal menyimpan pengingat.';
            setReminderModalError(message);
        } finally {
            setReminderModalSaving(false);
        }
    };

    const handleDeleteReminderItem = async (widgetId, itemId) => {
        const loadingKey = `delete-${itemId}`;
        setReminderLoadingState(loadingKey, true);

        try {
            await axios.delete(`/api/widget-reminders/items/${itemId}`);
            updateReminderItems(widgetId, (items) => items.filter((item) => item.id !== itemId));
            setReminderError(`item-${itemId}`, '');
            setStoppedCountdownByWidget((prev) => {
                if (!Object.prototype.hasOwnProperty.call(prev, widgetId)) return prev;

                const next = { ...prev };
                delete next[widgetId];
                return next;
            });
        } catch (errorResponse) {
            const message = errorResponse.response?.data?.message || 'Gagal menghapus pengingat.';
            setReminderError(`item-${itemId}`, message);
        } finally {
            setReminderLoadingState(loadingKey, false);
        }
    };

    const handleStopReminderCountdown = (widgetId, diffMs) => {
        setStoppedCountdownByWidget((prev) => ({
            ...prev,
            [widgetId]: Math.max(0, diffMs),
        }));
    };

    const handleResumeReminderCountdown = (widgetId) => {
        setStoppedCountdownByWidget((prev) => {
            if (!Object.prototype.hasOwnProperty.call(prev, widgetId)) return prev;

            const next = { ...prev };
            delete next[widgetId];
            return next;
        });
    };

    const handleResetReminderCountdown = (widgetId, originalDurationMs) => {
        setStoppedCountdownByWidget((prev) => {
            if (!Object.prototype.hasOwnProperty.call(prev, widgetId)) return prev;

            const next = { ...prev };
            delete next[widgetId];
            return next;
        });

        if (originalDurationMs > 0) {
            setCountdownTargetOverrideByWidget((prev) => ({
                ...prev,
                [widgetId]: Date.now() + originalDurationMs,
            }));
        }
    };

    const setTimerError = (widgetId, message = '') => {
        setTimerErrors((prev) => {
            if (!message) {
                const next = { ...prev };
                delete next[widgetId];
                return next;
            }

            return { ...prev, [widgetId]: message };
        });
    };

    const setTimerLoadingState = (widgetId, value) => {
        setTimerLoading((prev) => {
            if (!value) {
                const next = { ...prev };
                delete next[widgetId];
                return next;
            }

            return { ...prev, [widgetId]: true };
        });
    };

    const updateTimerWidgetData = (widgetId, timerData) => {
        setWorkspaces((prev) => prev.map((workspace) => {
            if (workspace.id !== activeWorkspaceId) return workspace;

            return {
                ...workspace,
                widgets: (workspace.widgets || []).map((widget) => (
                    widget.id === widgetId
                        ? { ...widget, timer: timerData }
                        : widget
                )),
            };
        }));
    };

    const callTimerAction = async (widgetId, action) => {
        setTimerLoadingState(widgetId, true);

        try {
            const response = await axios.post(`/api/widget-timers/${widgetId}/${action}`);
            updateTimerWidgetData(widgetId, response.data);
            setTimerError(widgetId, '');
        } catch (errorResponse) {
            const message = errorResponse.response?.data?.message || 'Gagal memperbarui timer.';
            setTimerError(widgetId, message);
        } finally {
            setTimerLoadingState(widgetId, false);
        }
    };

    const getEffectiveTimerElapsedSeconds = (timer) => {
        if (!timer) return 0;

        const baseElapsed = Math.max(0, Number(timer.elapsed_seconds || 0));
        if (!timer.is_running || !timer.started_at) {
            return baseElapsed;
        }

        const startedAtMs = new Date(timer.started_at).getTime();
        if (Number.isNaN(startedAtMs)) {
            return baseElapsed;
        }

        const elapsedSinceStart = Math.max(0, Math.floor((countdownNow - startedAtMs) / 1000));

        return baseElapsed + elapsedSinceStart;
    };

    const renderTimerWidget = (widget) => {
        const timer = widget.timer || null;
        const isBusy = Boolean(timerLoading[widget.id]);
        const isRunning = Boolean(timer?.is_running);
        const elapsedSeconds = getEffectiveTimerElapsedSeconds(timer);
        const timeDisplay = formatStopwatchSeconds(elapsedSeconds);

        return (
            <div className="flex h-full min-h-0 flex-col">
                <div data-no-drag="true" className="flex-1 min-h-0 rounded-xl border border-[#e8ddd0] bg-white p-4 flex flex-col items-center justify-center text-center">
                    {timerErrors[widget.id] && (
                        <p className="mb-2 text-xs text-red-500">{timerErrors[widget.id]}</p>
                    )}

                    <p
                        className="font-mono text-[2rem] font-semibold tracking-[0.08em] leading-none text-[#5a3e22]"
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                        {timeDisplay}
                    </p>

                    <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
                        <button
                            type="button"
                            data-no-drag="true"
                            disabled={isBusy || isRunning}
                            onClick={() => callTimerAction(widget.id, 'run')}
                            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors focus:outline-none ${
                                isBusy || isRunning
                                    ? 'cursor-not-allowed bg-[#f4eee6] text-[#b5a592]'
                                    : 'bg-[#a67c52] text-white hover:bg-[#8b6640]'
                            }`}
                        >
                            Mulai
                        </button>
                        <button
                            type="button"
                            data-no-drag="true"
                            disabled={isBusy || !isRunning}
                            onClick={() => callTimerAction(widget.id, 'stop')}
                            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors focus:outline-none ${
                                isBusy || !isRunning
                                    ? 'cursor-not-allowed bg-[#f4eee6] text-[#b5a592]'
                                    : 'text-[#6b5a47] hover:bg-[#f5efe8]'
                            }`}
                        >
                            Berhenti
                        </button>
                        <button
                            type="button"
                            data-no-drag="true"
                            disabled={isBusy || elapsedSeconds === 0}
                            onClick={() => callTimerAction(widget.id, 'reset')}
                            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors focus:outline-none ${
                                isBusy || elapsedSeconds === 0
                                    ? 'cursor-not-allowed bg-[#f4eee6] text-[#b5a592]'
                                    : 'text-[#6b5a47] hover:bg-[#f5efe8]'
                            }`}
                        >
                            Reset
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const updateWhiteboardWidgetData = (widgetId, whiteboardData) => {
        setWorkspaces((prev) => prev.map((workspace) => {
            if (workspace.id !== activeWorkspaceId) return workspace;

            return {
                ...workspace,
                widgets: (workspace.widgets || []).map((widget) => (
                    widget.id === widgetId
                        ? { ...widget, whiteboard: whiteboardData }
                        : widget
                )),
            };
        }));
    };

    const renderWhiteboardWidget = (widget) => (
        <WhiteboardWidget
            widgetId={widget.id}
            whiteboard={widget.whiteboard}
            readOnly
            onRequestOpen={() => openWhiteboardModal(widget.id)}
        />
    );

    const renderYoutubeWidget = (widget) => {
        const youtubeData = widget.youtube || null;
        const hasVideo = Boolean(youtubeData?.embed_url);
        const errorMessage = youtubeErrorByWidget[widget.id] || '';

        return (
            <div className="flex h-full min-h-0 flex-col">
                {errorMessage && (
                    <p className="mb-2 text-xs text-red-500">{errorMessage}</p>
                )}
                <div data-no-drag="true" className="flex-1 min-h-0 rounded-xl border border-[#e8ddd0] bg-white p-3 flex flex-col gap-3">
                    {hasVideo ? (
                        <iframe
                            src={youtubeData.embed_url}
                            title={widget.title || 'Video YouTube'}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            referrerPolicy="strict-origin-when-cross-origin"
                            allowFullScreen
                            className="h-full w-full rounded-xl border border-[#d8c8b5] bg-white"
                        />
                    ) : (
                        <div className="w-full flex-1 min-h-0 rounded-xl border border-dashed border-[#d8c8b5] bg-[#fcfaf7] px-4 py-3 flex items-center justify-center text-center">
                            <p className="text-sm text-[#8c7a66]">Belum ada link YouTube. Klik tombol + di header widget.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderPdfWidget = (widget) => {
        const pdfData = widget.pdf || null;
        const hasFile = Boolean(pdfData?.has_file && pdfData?.file_url);
        const isUploading = Boolean(pdfLoadingByWidget[widget.id]);
        const errorMessage = pdfErrorByWidget[widget.id] || '';
        const isSmall = (widget.size_preset || 'M') === 'S';
        const titleClass = isSmall
            ? 'text-sm leading-snug'
            : 'text-lg sm:text-xl leading-snug';
        const titleLineClamp = isSmall ? 2 : 3;

        return (
            <div className="flex h-full min-h-0 flex-col">
                {errorMessage && (
                    <p className="mb-2 text-xs text-red-500">{errorMessage}</p>
                )}
                {!hasFile ? (
                    <div data-no-drag="true" className="flex-1 min-h-0 rounded-xl border border-dashed border-[#d8c8b5] bg-white p-4 flex flex-col items-center justify-center text-center">
                        <p className="text-sm font-medium text-[#6b5a47]">Belum ada PDF</p>
                        <p className="mt-1 text-xs text-[#8c7a66]">Unggah 1 file PDF untuk widget ini.</p>
                        <label
                            htmlFor={`pdf-upload-${widget.id}`}
                            onClick={(event) => event.stopPropagation()}
                            className={`mt-4 inline-flex cursor-pointer items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                                isUploading
                                    ? 'cursor-not-allowed bg-[#f4eee6] text-[#b5a592]'
                                    : 'bg-[#a67c52] text-white hover:bg-[#8b6640]'
                            }`}
                        >
                            {isUploading ? 'Mengunggah...' : 'Unggah PDF'}
                        </label>
                        <input
                            data-no-drag="true"
                            id={`pdf-upload-${widget.id}`}
                            type="file"
                            accept="application/pdf,.pdf"
                            className="hidden"
                            disabled={isUploading}
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                handlePdfUpload(widget.id, file);
                                event.target.value = '';
                            }}
                        />
                    </div>
                ) : (
                    <button
                        data-no-drag="true"
                        type="button"
                        onClick={() => openPdfModal(widget)}
                        className="w-full flex-1 min-h-0 rounded-xl border border-[#e8ddd0] bg-white p-2 text-left hover:border-[#c4a882] transition-colors focus:outline-none focus:ring-2 focus:ring-[#c4a882]"
                    >
                        <div className="h-full min-h-0 flex flex-col">
                            <div className="flex-1 min-h-0 flex items-center justify-center px-3">
                                <p
                                    className={`w-full text-center font-semibold text-[#5a3e22] break-words ${titleClass}`}
                                    style={{
                                        display: '-webkit-box',
                                        WebkitLineClamp: titleLineClamp,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                    }}
                                >
                                    {pdfData.file_name}
                                </p>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                                <label
                                    htmlFor={`pdf-upload-${widget.id}`}
                                    onClick={(event) => event.stopPropagation()}
                                    className={`inline-flex cursor-pointer items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                        isUploading
                                            ? 'cursor-not-allowed border-[#e4d5c3] bg-[#f4eee6] text-[#b5a592]'
                                            : 'border-[#d8c8b5] bg-[#faf7f2] text-[#6b5a47] hover:bg-[#f3ebdf]'
                                    }`}
                                >
                                    {isUploading ? 'Mengunggah...' : 'Ganti PDF'}
                                </label>
                            </div>
                            <input
                                data-no-drag="true"
                                id={`pdf-upload-${widget.id}`}
                                type="file"
                                accept="application/pdf,.pdf"
                                className="hidden"
                                disabled={isUploading}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    handlePdfUpload(widget.id, file);
                                    event.target.value = '';
                                }}
                            />
                        </div>
                    </button>
                )}
            </div>
        );
    };

    const renderTodoWidget = (widget) => {
        const statuses = sortTodoStatuses(widget.todo_statuses || []);
        const items = sortTodoItems(widget.todo_items || []);
        const doneStatus = statuses.find((status) => String(status.name || '').toLowerCase() === 'selesai dilakukan') || null;
        const pendingStatus = getTodoStatusByName(widget, 'belum')
            || statuses.find((status) => status.id !== doneStatus?.id)
            || statuses[0]
            || null;
        const editingItemId = todoEditingItemByWidget[widget.id] ?? null;

        return (
            <div className="flex h-full min-h-0 flex-col">
                <div data-no-drag="true" className="flex-1 min-h-0 rounded-xl border border-[#e8ddd0] bg-white p-3">
                    {todoErrors[widget.id] && (
                        <p className="text-xs text-red-500">{todoErrors[widget.id]}</p>
                    )}
                    <div className="mt-2 h-full min-h-0 overflow-y-auto space-y-2 pr-1">
                    {items.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-[#d8c8b5] px-4 py-6 text-center text-xs text-[#8c7a66]">
                            Belum ada item.
                        </div>
                    ) : items.map((item) => {
                        const loadingUpdate = Boolean(todoLoading[`todo-item-update-${item.id}`]);
                        const loadingDelete = Boolean(todoLoading[`todo-item-delete-${item.id}`]);
                        const isBusy = loadingUpdate || loadingDelete;
                        const isChecked = doneStatus ? item.status_id === doneStatus.id : false;
                        const isEditing = editingItemId === item.id;
                        const editValue = todoEditDraftByItem[item.id] ?? item.content ?? '';

                        return (
                            <div key={item.id} className="rounded-lg border border-[#efe5d9] bg-[#fcfaf7] px-3 py-2">
                                <div className="flex items-start gap-2">
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            autoFocus
                                            value={editValue}
                                            onChange={(e) => handleTodoItemEditDraftChange(item.id, e.target.value)}
                                            onBlur={() => handleFinishTodoItemEdit(widget, item)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    e.currentTarget.blur();
                                                }
                                                if (e.key === 'Escape') {
                                                    e.preventDefault();
                                                    handleCancelTodoItemEdit(widget.id, item.id, item.content);
                                                }
                                            }}
                                            className="flex-1 min-w-0 rounded-md border border-[#dcc9b2] bg-white px-2 py-1 text-sm text-[#5a3e22] focus:outline-none focus:ring-2 focus:ring-[#c4a882]"
                                        />
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => handleStartTodoItemEdit(widget.id, item)}
                                            className={`flex-1 min-w-0 text-left rounded-md px-1 py-0.5 text-sm hover:bg-[#f3e9dd] ${isChecked ? 'text-[#9e8d79] line-through' : 'text-[#5a3e22]'}`}
                                        >
                                            {item.content}
                                        </button>
                                    )}

                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        disabled={isBusy || !doneStatus || !pendingStatus}
                                        onChange={() => {
                                            if (!doneStatus || !pendingStatus) {
                                                setTodoError(widget.id, 'Status default to-do belum siap.');
                                                return;
                                            }

                                            const nextStatusId = isChecked ? pendingStatus.id : doneStatus.id;
                                            if (nextStatusId === item.status_id) return;
                                            handleUpdateTodoItem(widget, item.id, { status_id: nextStatusId });
                                        }}
                                        className="mt-0.5 h-4 w-4 rounded border-[#ccb79f] text-[#a67c52] focus:ring-[#c4a882]"
                                    />
                                </div>
                            </div>
                        );
                    })}
                    </div>
                </div>
            </div>
        );
    };

    const renderReminderWidget = (widget) => {
        const reminders = sortReminderItems(widget.reminders || []);
        const primaryReminder = reminders[0] || null;
        const primaryReminderTargetAtMs = primaryReminder
            ? new Date(primaryReminder.remind_at).getTime()
            : null;
        const targetAtMs = primaryReminder
            ? (countdownTargetOverrideByWidget[widget.id] ?? primaryReminderTargetAtMs)
            : null;
        const originalDurationMs = primaryReminder
            ? getReminderOriginalDurationSeconds(primaryReminder) * 1000
            : 0;
        const liveDiffMs = primaryReminder
            ? (targetAtMs || 0) - countdownNow
            : 0;
        const hasStoppedValue = Object.prototype.hasOwnProperty.call(stoppedCountdownByWidget, widget.id);
        const effectiveDiffMs = hasStoppedValue ? stoppedCountdownByWidget[widget.id] : liveDiffMs;
        const isExpired = Boolean(primaryReminder) && !hasStoppedValue && liveDiffMs <= 0;
        const countdownDisplay = primaryReminder
            ? formatCountdown(effectiveDiffMs)
            : '--:--:--';
        const sizePreset = widget.size_preset || 'M';
        const isSmall = sizePreset === 'S';
        const isLarge = sizePreset === 'L';
        const containerPaddingClass = isSmall ? 'px-3 py-3' : isLarge ? 'px-5 py-5' : 'px-4 py-4';
        const iconClass = isSmall ? 'h-8 w-8' : isLarge ? 'h-12 w-12' : 'h-9 w-9';
        const countdownClass = isSmall
            ? 'text-[1.35rem] tracking-[0.05em]'
            : isLarge
                ? 'text-[clamp(1.6rem,4vw,2.4rem)] tracking-[0.03em]'
                : 'text-[2rem] tracking-[0.06em]';
        const titleClass = isSmall ? 'text-base font-medium' : isLarge ? 'text-2xl font-semibold' : 'text-xl font-semibold';
        const subtitleClass = isSmall ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
        const aturButtonClass = isSmall
            ? 'text-xs px-2 py-1.5'
            : isLarge
                ? 'text-base px-5 py-2.5'
                : 'text-sm px-4 py-2';
        const detailWrapClass = isSmall ? 'mt-2' : isLarge ? 'mt-4' : 'mt-3';
        const actionWrapClass = isSmall ? 'mt-3' : isLarge ? 'mt-6' : 'mt-4';
        const actionLayoutClass = isSmall
            ? 'w-full max-w-[240px] grid grid-cols-3 gap-1.5'
            : 'flex items-center justify-center gap-2 flex-wrap';
        const messageLineClampStyle = isSmall
            ? { WebkitLineClamp: 2 }
            : isLarge
                ? { WebkitLineClamp: 3 }
                : { WebkitLineClamp: 2 };

        return (
            <div className="flex flex-1 min-h-0 flex-col">
                <div data-no-drag="true" className={`rounded-xl border border-[#e8ddd0] bg-white h-full flex flex-col items-center justify-center text-center ${containerPaddingClass}`}>
                    <div className="w-full">
                        <div className={`mx-auto mb-2 inline-flex ${iconClass} items-center justify-center rounded-full border border-[#e8ddd0] bg-[#fcfaf7]`}>
                            {icons.bell}
                        </div>
                        <p
                            className={`mx-auto max-w-full overflow-hidden text-ellipsis whitespace-nowrap font-mono font-semibold leading-none ${isExpired ? 'text-[#a24835]' : 'text-[#5a3e22]'} ${countdownClass}`}
                            style={{ fontVariantNumeric: 'tabular-nums' }}
                        >
                            {countdownDisplay}
                        </p>
                        <div className={detailWrapClass}>
                            <p
                                className={`mx-auto max-w-full break-words text-[#8c7a66] ${titleClass}`}
                                style={{
                                    display: '-webkit-box',
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    ...messageLineClampStyle,
                                }}
                            >
                                {primaryReminder
                                    ? primaryReminder.message
                                    : 'Belum ada pengingat'}
                            </p>
                            {primaryReminder && (
                                <p className={`mt-1 break-words text-[#a08f7b] ${subtitleClass}`}>{formatReminderDateTime(primaryReminder.remind_at)}</p>
                            )}
                        </div>
                    </div>

                    <div className={`${actionWrapClass} ${actionLayoutClass}`}>
                        {primaryReminder ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => (
                                        hasStoppedValue
                                            ? handleResumeReminderCountdown(widget.id)
                                            : handleStopReminderCountdown(widget.id, liveDiffMs)
                                    )}
                                    className={`rounded-xl font-medium transition-colors focus:outline-none ${aturButtonClass} ${
                                        hasStoppedValue
                                            ? 'text-[#6b5a47] hover:bg-[#f5efe8]'
                                            : 'text-[#6b5a47] hover:bg-[#f5efe8]'
                                    } ${isSmall ? 'border border-[#e2d3bf]' : ''}`}
                                >
                                    {hasStoppedValue ? 'Lanjut' : 'Berhenti'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleResetReminderCountdown(widget.id, originalDurationMs)}
                                    disabled={!hasStoppedValue}
                                    className={`rounded-xl font-medium transition-colors focus:outline-none ${aturButtonClass} ${
                                        hasStoppedValue
                                            ? 'text-[#6b5a47] hover:bg-[#f5efe8]'
                                            : 'cursor-not-allowed bg-[#f4eee6] text-[#b5a592]'
                                    } ${isSmall ? 'border border-[#e2d3bf]' : ''}`}
                                >
                                    Reset
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openEditReminderModal(widget.id, primaryReminder)}
                                    className={`rounded-xl font-medium text-[#6b5a47] hover:bg-[#f5efe8] transition-colors focus:outline-none ${aturButtonClass} ${isSmall ? 'bg-[#f7f1e8] border border-[#e2d3bf]' : ''}`}
                                >
                                    Atur
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                data-no-drag="true"
                                onClick={() => openCreateReminderModal(widget.id)}
                                className={`rounded-xl bg-[#a67c52] font-medium text-white hover:bg-[#8b6640] transition-colors focus:outline-none ${aturButtonClass}`}
                            >
                                Atur Pengingat
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
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
                { label: 'Ruang Kerja', onClick: closeWorkspaceView },
                activeWorkspace?.topic ? {
                    label: activeWorkspace.topic,
                    onClick: () => {
                        setSelectedTopic(activeWorkspace.topic);
                        closeWorkspaceView();
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
                                                        <div className="mr-2 flex items-center gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    openEditTopicModal(topic);
                                                                    setIsTopicDropdownOpen(false);
                                                                }}
                                                                className="rounded-lg p-1.5 text-gray-300 opacity-0 transition-all hover:bg-amber-50 hover:text-amber-600 focus:outline-none group-hover/item:opacity-100"
                                                                title="Ubah topik"
                                                            >
                                                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16.862 4.487a2.25 2.25 0 113.182 3.182L7.5 20.213 3 21l.787-4.5 13.075-12.013z" />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    triggerDelete(e, 'topic', null, topic);
                                                                    setIsTopicDropdownOpen(false);
                                                                }}
                                                                className="rounded-lg p-1.5 text-gray-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 focus:outline-none group-hover/item:opacity-100"
                                                                title="Hapus topik"
                                                            >
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="border-t border-[#e8ddd0] p-2">
                                            <button
                                                onClick={() => {
                                                    setIsTopicDropdownOpen(false);
                                                    openCreateTopicModal();
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
                                                        onClick={() => openWorkspaceView(workspace)}
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
                                            onClick={() => openWorkspaceView(workspace)}
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
                        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={closeWorkspaceView}
                                    className="p-2 -ml-2 text-[#8c7a66] hover:text-[#5a3e22] hover:bg-[#e8ddd0] rounded-lg transition-colors focus:outline-none"
                                >
                                    {icons.back}
                                </button>

                                {isEditingTitle ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            ref={workspaceTitleInputRef}
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

                            <button
                                onClick={handleOpenWidgetCreation}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[#a67c52] text-white hover:bg-[#8b6640] transition-colors focus:outline-none shadow-sm"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                Tambah Widget
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 auto-rows-[8px] grid-flow-row-dense">
                            {reorderError && (
                                <div className="col-span-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                                    {reorderError}
                                </div>
                            )}
                            {activeWorkspaceWidgets.map((widget) => (
                                <div
                                    key={widget.id}
                                    draggable
                                    onDragStart={(event) => {
                                        if (dragOriginWidgetIdRef.current !== widget.id) {
                                            event.preventDefault();
                                            return;
                                        }
                                        preDragWidgetsRef.current = [...activeWorkspaceWidgets];
                                        setReorderError('');
                                        setDraggedWidgetId(widget.id);
                                        setHasDragChanges(false);
                                        event.dataTransfer.setData('text/plain', String(widget.id));
                                        event.dataTransfer.effectAllowed = 'move';
                                    }}
                                    onDragOver={(event) => {
                                        event.preventDefault();
                                        event.dataTransfer.dropEffect = 'move';
                                        if (draggedWidgetId && draggedWidgetId !== widget.id) {
                                            setDragOverWidgetId(widget.id);
                                            moveWidgetLocally(widget.id);
                                        }
                                    }}
                                    onDragLeave={() => {
                                        if (dragOverWidgetId === widget.id) {
                                            setDragOverWidgetId(null);
                                        }
                                    }}
                                    onDrop={(event) => {
                                        event.preventDefault();
                                        setDragOverWidgetId(null);
                                    }}
                                    onDragEnd={async () => {
                                        if (hasDragChanges && !isReorderSaving) {
                                            setIsReorderSaving(true);
                                            try {
                                                await persistWidgetReorder(latestActiveWidgetsRef.current);
                                            } catch {
                                                if (activeWorkspace) {
                                                    const rollbackWidgets = preDragWidgetsRef.current;
                                                    setWorkspaces(prev => prev.map((workspace) => (
                                                        workspace.id === activeWorkspace.id
                                                            ? { ...workspace, widgets: rollbackWidgets }
                                                            : workspace
                                                    )));
                                                }
                                                setReorderError('Urutan widget gagal disimpan. Tata letak dikembalikan.');
                                            } finally {
                                                setIsReorderSaving(false);
                                            }
                                        }
                                        setDraggedWidgetId(null);
                                        setDragOverWidgetId(null);
                                        setHasDragChanges(false);
                                        dragOriginWidgetIdRef.current = null;
                                        lastDragOverWidgetIdRef.current = null;
                                    }}
                                    style={{
                                        gridRowEnd: `span ${
                                            widget.type === 'reminder'
                                                ? (reminderRowSpanMap[widget.size_preset] || reminderRowSpanMap.M)
                                                : widget.type === 'todo'
                                                    ? (todoRowSpanMap[widget.size_preset] || todoRowSpanMap.M)
                                                : (widgetRowSpanMap[widget.size_preset] || widgetRowSpanMap.M)
                                        }`,
                                    }}
                                    className={`relative h-full bg-[#fdfbf8] rounded-2xl border p-4 flex flex-col ${dragOverWidgetId === widget.id ? 'border-[#c4a882] ring-2 ring-[#c4a882]/40' : 'border-[#e0d3c3]'}`}
                                >
                                    <div
                                        className={`flex items-center gap-2 mb-3 rounded-lg ${draggedWidgetId === widget.id ? 'cursor-grabbing' : 'cursor-grab'}`}
                                        onPointerDown={(event) => {
                                            if (event.target.closest('[data-no-drag="true"]')) {
                                                dragOriginWidgetIdRef.current = null;
                                                return;
                                            }
                                            dragOriginWidgetIdRef.current = widget.id;
                                        }}
                                    >
                                        <input
                                            data-no-drag="true"
                                            type="text"
                                            defaultValue={widget.title}
                                            onBlur={(e) => handleSaveWidgetTitle(widget.id, e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    e.currentTarget.blur();
                                                }
                                            }}
                                            className="flex-1 min-w-0 bg-transparent text-sm font-semibold text-[#5a3e22] border border-transparent hover:border-[#e0d3c3] focus:border-[#c4a882] rounded-lg px-2 py-1 focus:outline-none"
                                        />
                                        {widget.type === 'todo' && (
                                            <button
                                                data-no-drag="true"
                                                type="button"
                                                onClick={() => openTodoAddModal(widget.id)}
                                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#d8c8b5] bg-white text-lg leading-none text-[#6b5a47] hover:bg-[#f7f1e8] focus:outline-none focus:ring-2 focus:ring-[#c4a882]"
                                                aria-label="Tambah item"
                                                title="Tambah item"
                                            >
                                                +
                                            </button>
                                        )}
                                        {widget.type === 'youtube' && (
                                            <button
                                                data-no-drag="true"
                                                type="button"
                                                onClick={() => openYoutubeLinkModal(widget)}
                                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#d8c8b5] bg-white text-lg leading-none text-[#6b5a47] hover:bg-[#f7f1e8] focus:outline-none focus:ring-2 focus:ring-[#c4a882]"
                                                aria-label="Atur link YouTube"
                                                title="Atur link YouTube"
                                            >
                                                +
                                            </button>
                                        )}
                                        <button
                                            data-no-drag="true"
                                            type="button"
                                            onClick={() => handleCycleWidgetSize(widget)}
                                            className="min-w-9 px-2 py-1 text-xs font-semibold rounded-lg border border-[#d8c8b5] bg-white text-[#6b5a47] hover:bg-[#faf7f2] focus:outline-none focus:ring-2 focus:ring-[#c4a882]"
                                            title={`Ubah ukuran (sekarang ${widget.size_preset || 'M'})`}
                                        >
                                            {widget.size_preset || 'M'}
                                        </button>
                                        <button
                                            data-no-drag="true"
                                            onClick={(e) => triggerDelete(e, 'widget', widget.id, widget.title)}
                                            className="p-1.5 rounded-lg bg-white/80 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all focus:outline-none"
                                            title="Hapus widget"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                        <button
                                            type="button"
                                            className="p-1 text-[#9b866f] hover:text-[#6b5a47] hover:bg-[#f5eee5] rounded-md cursor-grab active:cursor-grabbing focus:outline-none"
                                            title="Geser widget"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6h.01M10 12h.01M10 18h.01M14 6h.01M14 12h.01M14 18h.01" />
                                            </svg>
                                        </button>
                                    </div>
                                    {widget.type === 'note' ? (
                                        <div className="w-full flex-1 min-h-0 rounded-xl border border-[#e8ddd0] bg-white overflow-hidden flex flex-col">
                                            <div
                                                className={`note-markdown flex-1 min-h-0 overflow-y-auto px-3 py-2 text-[#5a3e22] ${noteTextSizeClassMap[widget.note?.text_size || 'normal'] || noteTextSizeClassMap.normal}`}
                                                dangerouslySetInnerHTML={{
                                                    __html: renderNoteMarkdown(widget.note?.content || ''),
                                                }}
                                            />
                                            {!widget.note?.content && (
                                                <p className="px-3 pb-2 text-xs text-[#b8a28a]">
                                                    Belum ada isi catatan.
                                                </p>
                                            )}
                                            <div className="border-t border-[#eee3d5] px-3 py-2 flex items-center justify-between gap-2">
                                                <button
                                                    data-no-drag="true"
                                                    type="button"
                                                    onClick={() => openNoteModal(widget.id)}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-[#d8c8b5] bg-[#faf7f2] px-3 py-1.5 text-xs font-semibold text-[#6b5a47] hover:bg-[#f4ede4] focus:outline-none focus:ring-2 focus:ring-[#c4a882]"
                                                >
                                                    {icons.edit}
                                                    Edit
                                                </button>
                                            </div>
                                        </div>
                                    ) : widget.type === 'whiteboard' ? (
                                        renderWhiteboardWidget(widget)
                                    ) : widget.type === 'youtube' ? (
                                        renderYoutubeWidget(widget)
                                    ) : widget.type === 'pdf' ? (
                                        renderPdfWidget(widget)
                                    ) : widget.type === 'reminder' ? (
                                        renderReminderWidget(widget)
                                    ) : widget.type === 'todo' ? (
                                        renderTodoWidget(widget)
                                    ) : widget.type === 'timer' ? (
                                        renderTimerWidget(widget)
                                    ) : widget.type === 'chat' ? (
                                        <button
                                            data-no-drag="true"
                                            type="button"
                                            onClick={() => window.location.href = `/workspaces/${activeWorkspace.id}/chat/${widget.chat?.id || widget.chat_session_id}`}
                                            className="w-full flex-1 min-h-0 rounded-xl border border-[#d9c2a8] bg-gradient-to-br from-[#fffaf4] to-[#f8efe5] px-4 py-3 text-left hover:border-[#c4a882] transition-colors flex flex-col justify-between"
                                        >
                                            <div className="h-full rounded-xl bg-white/75 border border-[#eadbc9] flex items-center justify-center">
                                                <div className="relative">
                                                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#fff] border border-[#e1cfbc] text-[#b18762]">
                                                        {icons.message}
                                                    </span>
                                                </div>
                                            </div>
                                        </button>
                                    ) : (
                                        <div className="w-full flex-1 min-h-0 rounded-xl border border-dashed border-[#d8c8b5] bg-white p-3 text-xs text-[#8c7a66]">
                                            Tipe widget tidak didukung.
                                        </div>
                                    )}
                                </div>
                            ))}

                            {activeWorkspaceWidgets.length === 0 && (
                                <div className="col-span-full rounded-2xl border border-dashed border-[#d8c8b5] px-6 py-10 text-center text-sm text-[#8c7a66]">
                                    Belum ada widget. Klik "Tambah Widget" untuk mulai.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <Transition appear show={noteModal.open} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={closeNoteModal}>
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
                        <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                                enterTo="opacity-100 translate-y-0 sm:scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            >
                                <Dialog.Panel className="w-full h-screen sm:h-auto sm:max-h-[90vh] sm:max-w-4xl transform overflow-hidden bg-white sm:rounded-2xl text-left align-middle shadow-xl transition-all border border-[#e7dccf] flex flex-col">
                                    <div className="border-b border-[#eadfce] px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-[#5a3e22] truncate">
                                                {activeNoteWidget?.title || 'Catatan'}
                                            </Dialog.Title>
                                            <p className="text-xs sm:text-sm text-[#8c7a66] mt-0.5">
                                                Markdown + `==highlight==`
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={closeNoteModal}
                                            className="px-3 py-1.5 rounded-lg text-sm font-medium text-[#6b5a47] hover:bg-[#f5eee5] focus:outline-none"
                                        >
                                            Tutup
                                        </button>
                                    </div>

                                    <div className="px-4 sm:px-6 py-3 border-b border-[#f0e6d9] flex flex-wrap items-center justify-between gap-3">
                                        <div className="inline-flex rounded-lg bg-[#f7f0e6] p-1">
                                            <button
                                                type="button"
                                                onClick={() => setNoteModal((prev) => ({ ...prev, tab: 'edit' }))}
                                                className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${noteModal.tab === 'edit' ? 'bg-white text-[#5a3e22] shadow-sm' : 'text-[#8a755f] hover:text-[#5a3e22]'}`}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setNoteModal((prev) => ({ ...prev, tab: 'preview' }))}
                                                className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${noteModal.tab === 'preview' ? 'bg-white text-[#5a3e22] shadow-sm' : 'text-[#8a755f] hover:text-[#5a3e22]'}`}
                                            >
                                                Preview
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {noteTextSizeOptions.map((option) => (
                                                <button
                                                    key={option.key}
                                                    type="button"
                                                    onClick={() => activeNoteWidget && handleNoteTextSizeChange(activeNoteWidget.id, option.key)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${((activeNoteWidget?.note?.text_size || 'normal') === option.key)
                                                        ? 'bg-[#f5eee5] border-[#c4a882] text-[#5a3e22]'
                                                        : 'bg-white border-[#e0d3c3] text-[#8a755f] hover:text-[#5a3e22]'}`}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex-1 min-h-0 p-4 sm:p-6 overflow-y-auto bg-[#fcfaf7]">
                                        {noteModal.tab === 'edit' ? (
                                            <textarea
                                                value={activeNoteWidget?.note?.content || ''}
                                                onChange={(e) => activeNoteWidget && handleNoteContentChange(activeNoteWidget.id, e.target.value)}
                                                className={`w-full h-full min-h-[360px] resize-none rounded-xl border border-[#e0d3c3] bg-white px-4 py-3 text-[#5a3e22] placeholder-[#b8a28a] focus:outline-none focus:ring-2 focus:ring-[#c4a882] ${noteTextSizeClassMap[activeNoteWidget?.note?.text_size || 'normal'] || noteTextSizeClassMap.normal}`}
                                                placeholder="Tulis catatan Anda dalam Markdown..."
                                            />
                                        ) : (
                                            <div
                                                className={`note-markdown rounded-xl border border-[#e0d3c3] bg-white px-4 py-3 min-h-[360px] text-[#5a3e22] ${noteTextSizeClassMap[activeNoteWidget?.note?.text_size || 'normal'] || noteTextSizeClassMap.normal}`}
                                                dangerouslySetInnerHTML={{
                                                    __html: renderNoteMarkdown(activeNoteWidget?.note?.content || ''),
                                                }}
                                            />
                                        )}
                                    </div>

                                    <div className="border-t border-[#eadfce] px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
                                        <p className="text-xs sm:text-sm text-[#8c7a66]">
                                            {currentNoteSaveState?.status === 'saving' && 'Menyimpan...'}
                                            {currentNoteSaveState?.status === 'saved' && 'Tersimpan'}
                                            {currentNoteSaveState?.status === 'error' && (currentNoteSaveState?.message || 'Gagal menyimpan catatan.')}
                                            {!currentNoteSaveState?.status && 'Perubahan tersimpan otomatis.'}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={closeNoteModal}
                                            className="px-4 py-2 rounded-lg text-sm font-medium bg-[#a67c52] text-white hover:bg-[#8b6640] transition-colors focus:outline-none"
                                        >
                                            Selesai
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            <Transition appear show={whiteboardModal.open} as={Fragment} afterLeave={handleWhiteboardModalAfterLeave}>
                <Dialog as="div" className="relative z-50" onClose={closeWhiteboardModal}>
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
                        <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                                enterTo="opacity-100 translate-y-0 sm:scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            >
                                <Dialog.Panel className="w-full h-screen sm:h-auto sm:max-h-[90vh] sm:max-w-5xl transform overflow-hidden bg-white sm:rounded-2xl text-left align-middle shadow-xl transition-all border border-[#e7dccf] flex flex-col">
                                    <div className="border-b border-[#eadfce] px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-[#5a3e22] truncate">
                                                {activeWhiteboardWidget?.title || 'Whiteboard'}
                                            </Dialog.Title>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={closeWhiteboardModal}
                                            className="px-3 py-1.5 rounded-lg text-sm font-medium text-[#6b5a47] hover:bg-[#f5eee5] focus:outline-none"
                                        >
                                            Tutup
                                        </button>
                                    </div>

                                    <div className="flex-1 min-h-0 p-4 sm:p-6 bg-[#fcfaf7]">
                                        {activeWhiteboardWidget ? (
                                            <WhiteboardWidget
                                                widgetId={activeWhiteboardWidget.id}
                                                whiteboard={activeWhiteboardWidget.whiteboard}
                                                onSaved={(whiteboardData) => updateWhiteboardWidgetData(activeWhiteboardWidget.id, whiteboardData)}
                                            />
                                        ) : (
                                            <div className="h-full min-h-[240px] rounded-xl border border-dashed border-[#d8c8b5] bg-white flex items-center justify-center text-sm text-[#8c7a66]">
                                                Whiteboard tidak ditemukan.
                                            </div>
                                        )}
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            <Transition appear show={youtubeLinkModal.open} as={Fragment} afterLeave={handleYoutubeLinkModalAfterLeave}>
                <Dialog as="div" className="relative z-50" onClose={closeYoutubeLinkModal}>
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
                                <Dialog.Panel className="w-full max-w-xl transform overflow-hidden bg-white rounded-2xl p-6 sm:p-7 text-left align-middle shadow-xl transition-all border border-[#e7dccf]">
                                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-[#5a3e22] mb-1">
                                        Atur Link YouTube
                                    </Dialog.Title>
                                    <p className="text-sm text-[#8c7a66] mb-5">
                                        Tempel link YouTube (watch, youtu.be, atau shorts).
                                    </p>

                                    {activeYoutubeLinkWidget ? (
                                        <form
                                            onSubmit={(event) => {
                                                event.preventDefault();
                                                handleYoutubeLinkSave(activeYoutubeLinkWidget, { closeOnSuccess: true });
                                            }}
                                        >
                                            <input
                                                data-no-drag="true"
                                                type="url"
                                                value={youtubeDraftByWidget[activeYoutubeLinkWidget.id] ?? activeYoutubeLinkWidget.youtube?.source_url ?? ''}
                                                onChange={(event) => handleYoutubeDraftChange(activeYoutubeLinkWidget.id, event.target.value)}
                                                placeholder="https://www.youtube.com/watch?v=..."
                                                className="w-full rounded-xl border border-[#ddd0c0] bg-[#faf7f2] px-4 py-3 text-[#4a3728] focus:outline-none focus:ring-2 focus:ring-[#c4a882]"
                                                autoFocus
                                            />
                                            {youtubeErrorByWidget[activeYoutubeLinkWidget.id] && (
                                                <p className="mt-2 text-sm text-red-500">
                                                    {youtubeErrorByWidget[activeYoutubeLinkWidget.id]}
                                                </p>
                                            )}
                                            <div className="mt-6 flex justify-end gap-3">
                                                <button
                                                    type="button"
                                                    onClick={closeYoutubeLinkModal}
                                                    className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors focus:outline-none"
                                                >
                                                    Batal
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={Boolean(youtubeLoadingByWidget[activeYoutubeLinkWidget.id])}
                                                    className="px-6 py-2.5 rounded-xl text-sm font-medium bg-[#a67c52] text-white hover:bg-[#8b6640] disabled:opacity-40 transition-colors focus:outline-none"
                                                >
                                                    {youtubeLoadingByWidget[activeYoutubeLinkWidget.id] ? 'Menyimpan...' : 'Simpan Link'}
                                                </button>
                                            </div>
                                        </form>
                                    ) : (
                                        <div className="rounded-xl border border-dashed border-[#d8c8b5] bg-[#fcfaf7] px-4 py-6 text-sm text-[#8c7a66]">
                                            Widget YouTube tidak ditemukan.
                                        </div>
                                    )}
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            <Transition appear show={pdfModal.open} as={Fragment} afterLeave={handlePdfModalAfterLeave}>
                <Dialog as="div" className="relative z-50" onClose={closePdfModal}>
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
                        <div className="flex min-h-full items-center justify-center p-2 sm:p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-6xl h-[92vh] transform overflow-hidden bg-white rounded-2xl text-left align-middle shadow-xl transition-all border border-[#e7dccf] flex flex-col">
                                    <div className="border-b border-[#eadfce] px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <Dialog.Title as="h3" className="text-base sm:text-lg font-semibold leading-6 text-[#5a3e22] truncate">
                                                {activePdfWidget?.title || 'Dokumen PDF'}
                                            </Dialog.Title>
                                            <p className="text-xs sm:text-sm text-[#8c7a66] mt-0.5 truncate">
                                                {activePdfWidget?.pdf?.file_name || 'File PDF'}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={closePdfModal}
                                            className="px-3 py-1.5 rounded-lg text-sm font-medium text-[#6b5a47] hover:bg-[#f5eee5] focus:outline-none"
                                        >
                                            Tutup
                                        </button>
                                    </div>

                                    <div className="flex-1 min-h-0 p-3 sm:p-4 bg-[#fcfaf7]">
                                        {activePdfWidget?.pdf?.file_url ? (
                                            <iframe
                                                src={activePdfWidget.pdf.file_url}
                                                title={activePdfWidget.title || 'Dokumen PDF'}
                                                className="h-full w-full rounded-xl border border-[#e0d3c3] bg-white"
                                            />
                                        ) : (
                                            <div className="h-full w-full rounded-xl border border-dashed border-[#d8c8b5] bg-white flex items-center justify-center text-sm text-[#8c7a66]">
                                                File PDF tidak tersedia.
                                            </div>
                                        )}
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            <Transition appear show={isAddWorkspaceModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={handleCloseWorkspaceModal}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-0"
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
                                <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden bg-white rounded-2xl p-8 sm:p-10 text-left align-middle shadow-lg transition-all border border-gray-200">
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
                <Dialog as="div" className="relative z-50" onClose={closeTopicModal}>
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
                                        {topicModalMode === 'edit' ? 'Ubah Topik' : 'Topik Baru'}
                                    </Dialog.Title>
                                    <div className="mb-6">
                                        <p className="text-sm text-[#8c7a66]">
                                            {topicModalMode === 'edit'
                                                ? 'Perbarui nama topik untuk mengelompokkan folder Anda.'
                                                : 'Buat kategori topik baru untuk ruang belajar Anda.'}
                                        </p>
                                    </div>

                                    <form onSubmit={handleSubmitTopicModal}>
                                        <div>
                                            <input
                                                ref={topicNameInputRef}
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
                                                onClick={closeTopicModal}
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
            <Transition appear show={isWidgetModalOpen} as={Fragment} afterLeave={handleWidgetModalAfterLeave}>
                <Dialog as="div" className="relative z-50" onClose={handleCloseWidgetCreation}>
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
                                <Dialog.Panel className={`w-full transform overflow-hidden bg-white rounded-3xl text-left align-middle shadow-xl border border-[#e7dccf] ${widgetModalStep === 'select' ? 'max-w-4xl p-6 sm:p-8' : 'max-w-md p-7'}`}>
                                    {widgetModalStep !== 'detail' ? (
                                        <>
                                            <Dialog.Title as="h3" className="text-xl sm:text-2xl font-semibold leading-tight text-[#5a3e22] tracking-tight mb-1">
                                                Tambah Widget
                                            </Dialog.Title>
                                            <div className="mb-6 sm:mb-8">
                                                <p className="text-sm sm:text-base text-[#8c7a66]">
                                                    Pilih jenis widget yang ingin ditambahkan ke papan.
                                                </p>
                                            </div>
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                                                {widgetTypePickerOptions.map((option) => (
                                                    <button
                                                        key={option.key}
                                                        type="button"
                                                        onClick={() => handleChooseWidgetType(option.key)}
                                                        className="group aspect-square w-full overflow-hidden rounded-2xl border border-[#dfcfba] bg-[#fdfbf8] text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c9ae8e] hover:shadow-[0_10px_28px_-16px_rgba(90,62,34,0.75)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c4a882]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                                                    >
                                                        <div className="h-full p-3 sm:p-4 flex flex-col">
                                                            <p className="mt-1 text-sm sm:text-base font-semibold text-[#5a3e22] tracking-tight">
                                                                {option.title}
                                                            </p>
                                                            <p className="mt-1 text-[11px] sm:text-xs leading-relaxed text-[#8c7a66]">
                                                                {option.description}
                                                            </p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="mt-7 sm:mt-8 flex justify-end gap-3">
                                                <button
                                                    type="button"
                                                    onClick={handleCloseWidgetCreation}
                                                    className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors focus:outline-none"
                                                >
                                                    Batal
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-[#5a3e22] mb-1">
                                                {widgetTypeConfig[newWidgetType]?.createTitle || widgetTypeConfig.note.createTitle}
                                            </Dialog.Title>
                                            <div className="mb-6">
                                                <p className="text-sm text-[#8c7a66]">
                                                    {widgetTypeConfig[newWidgetType]?.helper || widgetTypeConfig.note.helper}
                                                </p>
                                            </div>
                                            <form onSubmit={handleCreateWidget}>
                                                <div className="space-y-4">
                                                    <div>
                                                        <input
                                                            ref={widgetTitleInputRef}
                                                            type="text"
                                                            value={newWidgetTitle}
                                                            onChange={(e) => {
                                                                setNewWidgetTitle(e.target.value);
                                                                if (widgetError) setWidgetError('');
                                                            }}
                                                            placeholder={widgetTypeConfig[newWidgetType]?.placeholder || widgetTypeConfig.note.placeholder}
                                                            className={`w-full bg-[#faf7f2] border ${widgetError ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : 'border-[#ddd0c0] focus:ring-[#c4a882] focus:border-[#c4a882]'} rounded-xl px-4 py-3 text-[#4a3728] focus:outline-none focus:ring-2 transition-all`}
                                                            autoFocus
                                                        />
                                                    </div>
                                                    {widgetError && (
                                                        <p className="text-sm text-red-500 font-medium">
                                                            {widgetError}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="mt-8 flex justify-end gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={handleBackToWidgetSelection}
                                                        className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors focus:outline-none"
                                                    >
                                                        Batal
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        disabled={!newWidgetTitle.trim() || isSaving}
                                                        className="px-6 py-2.5 rounded-xl text-sm font-medium bg-[#a67c52] text-white hover:bg-[#8b6640] disabled:opacity-40 transition-colors focus:outline-none"
                                                    >
                                                        {isSaving ? 'Menyimpan...' : (widgetTypeConfig[newWidgetType]?.createTitle || 'Buat Widget')}
                                                    </button>
                                                </div>
                                            </form>
                                        </>
                                    )}
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
            <Transition appear show={todoAddModal.open} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={closeTodoAddModal}>
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
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden bg-white rounded-2xl p-6 text-left align-middle shadow-lg transition-all border border-gray-200">
                                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-[#5a3e22] mb-1">
                                        Tambah Item
                                    </Dialog.Title>
                                    <p className="mb-4 text-sm text-[#8c7a66]">
                                        Masukkan item baru untuk to-do.
                                    </p>

                                    <form onSubmit={handleSubmitTodoAddModal}>
                                        <input
                                            type="text"
                                            value={todoAddModal.widgetId ? (todoDraftByWidget[todoAddModal.widgetId] || '') : ''}
                                            onChange={(e) => {
                                                if (!todoAddModal.widgetId) return;
                                                handleTodoItemDraftChange(todoAddModal.widgetId, e.target.value);
                                            }}
                                            placeholder="Contoh: Belajar 30 menit"
                                            className="w-full rounded-xl border border-[#ddd0c0] bg-[#faf7f2] px-4 py-3 text-[#4a3728] focus:outline-none focus:ring-2 focus:ring-[#c4a882]"
                                            autoFocus
                                        />

                                        {todoAddModal.widgetId && todoErrors[todoAddModal.widgetId] && (
                                            <p className="mt-2 text-sm text-red-500">
                                                {todoErrors[todoAddModal.widgetId]}
                                            </p>
                                        )}

                                        <div className="mt-6 flex justify-end gap-3">
                                            <button
                                                type="button"
                                                onClick={closeTodoAddModal}
                                                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors focus:outline-none"
                                            >
                                                Batal
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={
                                                    !todoAddModal.widgetId
                                                    || !(todoDraftByWidget[todoAddModal.widgetId] || '').trim()
                                                    || Boolean(todoLoading[`todo-item-create-${todoAddModal.widgetId}`])
                                                }
                                                className="px-6 py-2.5 rounded-xl text-sm font-medium bg-[#a67c52] text-white hover:bg-[#8b6640] disabled:opacity-40 transition-colors focus:outline-none"
                                            >
                                                {todoAddModal.widgetId && todoLoading[`todo-item-create-${todoAddModal.widgetId}`] ? 'Menyimpan...' : 'Simpan'}
                                            </button>
                                        </div>
                                    </form>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
            <Transition appear show={reminderModal.open} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={closeReminderModal}>
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
                                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden bg-white rounded-2xl p-7 sm:p-8 text-left align-middle shadow-lg transition-all border border-gray-200">
                                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-[#5a3e22] mb-1">
                                        {reminderModal.itemId ? 'Atur Pengingat' : 'Tambah Pengingat'}
                                    </Dialog.Title>
                                    <div className="mb-6">
                                        <p className="text-sm text-[#8c7a66]">
                                            Atur isi pengingat dan durasi jam/menit/detik.
                                        </p>
                                    </div>

                                    <form onSubmit={handleSubmitReminderModal} className="space-y-3">
                                        <input
                                            ref={reminderMessageInputRef}
                                            type="text"
                                            value={reminderForm.message}
                                            onChange={(e) => handleReminderFormChange('message', e.target.value)}
                                            className="w-full rounded-xl border border-[#ddd0c0] bg-[#faf7f2] px-4 py-3 text-[#4a3728] focus:outline-none focus:ring-2 focus:ring-[#c4a882]"
                                            placeholder="Isi pengingat"
                                            autoFocus
                                        />
                                        <div className="rounded-2xl border border-[#e4d6c6] bg-[#f8f3ed] p-4">
                                            <div className="flex items-center justify-center gap-2 sm:gap-4">
                                                {[
                                                    { field: 'remindHours', label: 'Jam', max: 99 },
                                                    { field: 'remindMinutes', label: 'Menit', max: 59 },
                                                    { field: 'remindSeconds', label: 'Detik', max: 59 },
                                                ].map((unit, index) => (
                                                    <Fragment key={unit.field}>
                                                        <div className="w-[112px] sm:w-[138px] rounded-2xl border border-[#d9c9b8] bg-white px-2 sm:px-3 py-2.5 shadow-sm">
                                                            <button
                                                                type="button"
                                                                onClick={() => adjustReminderFormDuration(unit.field, 1, unit.max)}
                                                                className="w-full rounded-md py-0.5 text-sm font-semibold text-[#9b7c59] hover:bg-[#f6efe6] focus:outline-none"
                                                            >
                                                                +
                                                            </button>
                                                            <input
                                                                type="text"
                                                                inputMode="numeric"
                                                                value={String(clampDurationPart(reminderForm[unit.field], unit.max)).padStart(2, '0')}
                                                                onChange={(e) => handleReminderFormChange(unit.field, e.target.value)}
                                                                onFocus={(e) => e.currentTarget.select()}
                                                                className="w-full rounded-lg border border-[#d8cdbf] bg-[#fffdfa] py-2 text-center text-4xl sm:text-5xl font-semibold leading-none tracking-[0.02em] text-[#4f3a27] focus:outline-none focus:ring-2 focus:ring-[#c4a882]"
                                                                aria-label={unit.label}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => adjustReminderFormDuration(unit.field, -1, unit.max)}
                                                                className="w-full rounded-md py-0.5 text-sm font-semibold text-[#9b7c59] hover:bg-[#f6efe6] focus:outline-none"
                                                            >
                                                                -
                                                            </button>
                                                            <p className="mt-2 text-center text-[12px] font-semibold uppercase tracking-[0.12em] text-[#8c7a66]">
                                                                {unit.label}
                                                            </p>
                                                        </div>
                                                        {index < 2 && (
                                                            <span className="self-center pb-7 text-4xl font-semibold text-[#90785f]">:</span>
                                                        )}
                                                    </Fragment>
                                                ))}
                                            </div>
                                        </div>
                                        <label className="inline-flex items-center gap-2 text-sm text-[#6b5a47]">
                                            <input
                                                type="checkbox"
                                                checked={reminderForm.sendWhatsapp}
                                                onChange={(e) => handleReminderFormChange('sendWhatsapp', e.target.checked)}
                                                className="h-4 w-4 rounded border-[#d8c8b5] text-[#a67c52] focus:ring-[#c4a882]"
                                            />
                                            Kirim ke WhatsApp
                                        </label>

                                        {reminderModalError && (
                                            <p className="text-sm text-red-500 font-medium">
                                                {reminderModalError}
                                            </p>
                                        )}

                                        <div className="pt-2 flex justify-end gap-3">
                                            <button
                                                type="button"
                                                onClick={closeReminderModal}
                                                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors focus:outline-none"
                                            >
                                                Batal
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={reminderModalSaving}
                                                className="px-6 py-2.5 rounded-xl text-sm font-medium bg-[#a67c52] text-white hover:bg-[#8b6640] disabled:opacity-40 transition-colors focus:outline-none"
                                            >
                                                {reminderModalSaving ? 'Menyimpan...' : 'Simpan'}
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
