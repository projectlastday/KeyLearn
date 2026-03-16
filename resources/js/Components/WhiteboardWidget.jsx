import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import axios from 'axios';

const colorMap = {
    red: '#cf2f2f',
    black: '#1b1b1b',
    blue: '#2a63d9',
};

const sizeMap = {
    S: 2,
    M: 4,
    L: 7,
};

const defaultStrokeSize = 'M';

const normalizePoint = (x, y, width, height) => {
    const safeWidth = Math.max(1, width);
    const safeHeight = Math.max(1, height);

    return {
        x: Math.max(0, Math.min(1, x / safeWidth)),
        y: Math.max(0, Math.min(1, y / safeHeight)),
    };
};

const toCanvasPoint = (point, width, height) => ({
    x: point.x * width,
    y: point.y * height,
});

const maxNormalizedJump = 0.2;

const getEventPointFromBounds = (event, bounds, { strictBounds = false } = {}) => {
    if (!bounds) return null;

    const localX = event.clientX - bounds.left;
    const localY = event.clientY - bounds.top;

    if (strictBounds && (localX < 0 || localY < 0 || localX > bounds.width || localY > bounds.height)) {
        return null;
    }

    return normalizePoint(localX, localY, bounds.width, bounds.height);
};

const buildStroke = (tool, color, startPoint) => ({
    tool,
    color: tool === 'eraser' ? null : color,
    size: defaultStrokeSize,
    points: [startPoint],
});

const drawStroke = (ctx, stroke, width, height) => {
    if (!stroke?.points?.length) return;

    ctx.save();
    ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = stroke.tool === 'eraser' ? '#000000' : (colorMap[stroke.color] || colorMap.black);
    ctx.lineWidth = sizeMap[stroke.size] || sizeMap.M;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const first = toCanvasPoint(stroke.points[0], width, height);
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);

    if (stroke.points.length === 1) {
        ctx.lineTo(first.x + 0.001, first.y + 0.001);
    } else {
        stroke.points.slice(1).forEach((point) => {
            const canvasPoint = toCanvasPoint(point, width, height);
            ctx.lineTo(canvasPoint.x, canvasPoint.y);
        });
    }

    ctx.stroke();
    ctx.restore();
};

const areStrokesEqual = (left = [], right = []) => {
    if (left === right) return true;
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    if (left.length !== right.length) return false;

    for (let i = 0; i < left.length; i += 1) {
        const leftStroke = left[i];
        const rightStroke = right[i];

        if (!leftStroke || !rightStroke) return false;
        if (leftStroke.tool !== rightStroke.tool) return false;
        if (leftStroke.color !== rightStroke.color) return false;
        if (leftStroke.size !== rightStroke.size) return false;

        const leftPoints = leftStroke.points || [];
        const rightPoints = rightStroke.points || [];
        if (leftPoints.length !== rightPoints.length) return false;

        for (let pointIndex = 0; pointIndex < leftPoints.length; pointIndex += 1) {
            const leftPoint = leftPoints[pointIndex];
            const rightPoint = rightPoints[pointIndex];
            if (!leftPoint || !rightPoint) return false;
            if (leftPoint.x !== rightPoint.x || leftPoint.y !== rightPoint.y) return false;
        }
    }

    return true;
};

export default function WhiteboardWidget({ widgetId, whiteboard, onSaved, readOnly = false, onRequestOpen = null }) {
    const [tool, setTool] = useState('pen');
    const [color, setColor] = useState('black');
    const [strokes, setStrokes] = useState(() => whiteboard?.strokes || []);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
    const canvasRef = useRef(null);
    const wrapperRef = useRef(null);
    const drawingRef = useRef(null);
    const pointerIdRef = useRef(null);
    const drawingBoundsRef = useRef(null);
    const strokesRef = useRef(whiteboard?.strokes || []);
    const saveVersionRef = useRef(0);
    const pendingSavesRef = useRef(0);

    useEffect(() => {
        const incomingStrokes = whiteboard?.strokes || [];
        if (pendingSavesRef.current > 0 && !areStrokesEqual(incomingStrokes, strokesRef.current)) {
            return;
        }

        if (areStrokesEqual(incomingStrokes, strokesRef.current)) {
            return;
        }

        strokesRef.current = incomingStrokes;
        setStrokes(incomingStrokes);
    }, [whiteboard?.id, whiteboard?.updated_at, whiteboard?.strokes, isSaving]);

    useEffect(() => {
        strokesRef.current = strokes;
    }, [strokes]);

    const redraw = useCallback((nextStrokes = strokesRef.current, inProgressStroke = null) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.clientWidth;
        const height = canvas.clientHeight;

        ctx.clearRect(0, 0, width, height);

        nextStrokes.forEach((stroke) => drawStroke(ctx, stroke, width, height));
        if (inProgressStroke) {
            drawStroke(ctx, inProgressStroke, width, height);
        }
    }, []);

    const syncCanvasResolution = useCallback(() => {
        const canvas = canvasRef.current;
        const wrapper = wrapperRef.current;
        if (!canvas || !wrapper) return;

        const rect = wrapper.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const cssWidth = Math.max(1, Math.floor(rect.width));
        const cssHeight = Math.max(1, Math.floor(rect.height));

        canvas.width = Math.floor(cssWidth * dpr);
        canvas.height = Math.floor(cssHeight * dpr);
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        redraw(strokesRef.current, drawingRef.current);
    }, [redraw]);

    useEffect(() => {
        syncCanvasResolution();
    }, [syncCanvasResolution]);

    useEffect(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper) return undefined;

        const observer = typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(() => syncCanvasResolution())
            : null;

        if (observer) {
            observer.observe(wrapper);
        } else {
            window.addEventListener('resize', syncCanvasResolution);
        }

        return () => {
            if (observer) {
                observer.disconnect();
            } else {
                window.removeEventListener('resize', syncCanvasResolution);
            }
        };
    }, [syncCanvasResolution]);

    useEffect(() => {
        redraw(strokes, drawingRef.current);
    }, [strokes, redraw]);

    const persistStrokes = useCallback(async (nextStrokes) => {
        if (readOnly) return;
        const saveVersion = saveVersionRef.current + 1;
        saveVersionRef.current = saveVersion;
        pendingSavesRef.current += 1;
        setIsSaving(true);
        setError('');

        try {
            const response = await axios.put(`/api/widget-whiteboards/${widgetId}`, {
                strokes: nextStrokes,
            });
            if (saveVersion !== saveVersionRef.current) {
                return;
            }
            onSaved?.(response.data.whiteboard);
        } catch (errorResponse) {
            if (saveVersion !== saveVersionRef.current) {
                return;
            }
            const message = errorResponse.response?.data?.message || 'Gagal menyimpan whiteboard.';
            setError(message);
        } finally {
            pendingSavesRef.current = Math.max(0, pendingSavesRef.current - 1);
            setIsSaving(pendingSavesRef.current > 0);
        }
    }, [readOnly, widgetId, onSaved]);

    const finishDrawing = useCallback(async () => {
        const activeStroke = drawingRef.current;
        drawingRef.current = null;
        pointerIdRef.current = null;
        drawingBoundsRef.current = null;
        if (!activeStroke || activeStroke.points.length === 0) {
            redraw(strokesRef.current, null);
            return;
        }

        const nextStrokes = [...strokesRef.current, activeStroke];
        strokesRef.current = nextStrokes;
        setStrokes(nextStrokes);
        redraw(nextStrokes, null);
        await persistStrokes(nextStrokes);
    }, [persistStrokes, redraw]);

    const handlePointerDown = (event) => {
        if (readOnly) return;
        event.preventDefault();
        event.stopPropagation();

        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        drawingBoundsRef.current = {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
        };

        const firstPoint = getEventPointFromBounds(event, drawingBoundsRef.current, { strictBounds: true });
        if (!firstPoint) return;

        pointerIdRef.current = event.pointerId;
        drawingRef.current = buildStroke(tool, color, firstPoint);
        redraw(strokesRef.current, drawingRef.current);
    };

    const handlePointerMove = (event) => {
        if (readOnly) return;
        if (pointerIdRef.current === null || pointerIdRef.current !== event.pointerId || !drawingRef.current) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        const point = getEventPointFromBounds(event, drawingBoundsRef.current, { strictBounds: true });
        if (!point) return;

        const activeStroke = drawingRef.current;
        const lastPoint = activeStroke.points[activeStroke.points.length - 1];
        if (lastPoint && lastPoint.x === point.x && lastPoint.y === point.y) {
            return;
        }

        if (lastPoint) {
            const dx = point.x - lastPoint.x;
            const dy = point.y - lastPoint.y;
            const jumpDistance = Math.sqrt((dx * dx) + (dy * dy));
            if (jumpDistance > maxNormalizedJump) {
                return;
            }
        }

        activeStroke.points.push(point);
        redraw(strokesRef.current, activeStroke);
    };

    const handlePointerUp = async (event) => {
        if (readOnly) return;
        if (pointerIdRef.current === null || pointerIdRef.current !== event.pointerId) return;
        event.preventDefault();
        event.stopPropagation();
        await finishDrawing();
    };

    const handlePointerCancel = async (event) => {
        if (readOnly) return;
        if (pointerIdRef.current === null || pointerIdRef.current !== event.pointerId) return;
        event.preventDefault();
        event.stopPropagation();
        await finishDrawing();
    };

    const handlePointerLeave = async (event) => {
        if (readOnly) return;
        if (pointerIdRef.current === null || pointerIdRef.current !== event.pointerId) return;
        event.preventDefault();
        event.stopPropagation();
        await finishDrawing();
    };

    const confirmClear = async () => {
        const nextStrokes = [];
        strokesRef.current = nextStrokes;
        setStrokes(nextStrokes);
        redraw(nextStrokes, null);
        await persistStrokes(nextStrokes);
        setIsClearConfirmOpen(false);
    };

    if (readOnly) {
        return (
            <div className="flex h-full min-h-0 flex-col">
                <button
                    type="button"
                    data-no-drag="true"
                    onClick={() => onRequestOpen?.()}
                    className="flex-1 min-h-0 rounded-xl border border-[#e8ddd0] bg-white p-2 text-left transition-colors hover:border-[#c9ae8e] focus:outline-none"
                >
                    <div ref={wrapperRef} className="relative h-full min-h-[140px] w-full overflow-hidden rounded-lg border border-[#ede3d6] bg-white">
                        <canvas
                            ref={canvasRef}
                            data-no-drag="true"
                            className="h-full w-full pointer-events-none"
                        />
                    </div>
                </button>
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div data-no-drag="true" className="mb-2 flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    data-no-drag="true"
                    onClick={() => setTool('pen')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none ${
                        tool === 'pen'
                            ? 'bg-[#a67c52] text-white'
                            : 'bg-[#f7f1e8] text-[#6b5a47] hover:bg-[#efe4d7]'
                    }`}
                >
                    Pena
                </button>
                <button
                    type="button"
                    data-no-drag="true"
                    onClick={() => setTool('eraser')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none ${
                        tool === 'eraser'
                            ? 'bg-[#a67c52] text-white'
                            : 'bg-[#f7f1e8] text-[#6b5a47] hover:bg-[#efe4d7]'
                    }`}
                >
                    Penghapus
                </button>
                <div className="ml-1 flex items-center gap-1.5">
                    {['red', 'black', 'blue'].map((colorKey) => (
                        <button
                            key={colorKey}
                            type="button"
                            data-no-drag="true"
                            onClick={() => setColor(colorKey)}
                            className={`h-6 w-6 rounded-full border-2 transition-transform focus:outline-none ${
                                color === colorKey ? 'scale-105 border-[#7f664b]' : 'border-[#e4d7c8]'
                            }`}
                            style={{ backgroundColor: colorMap[colorKey] }}
                            title={colorKey}
                        />
                    ))}
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                    <button
                        type="button"
                        data-no-drag="true"
                        onClick={() => setIsClearConfirmOpen(true)}
                        className="rounded-lg bg-red-50 px-3 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 focus:outline-none"
                    >
                        Clear
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0 rounded-xl border border-[#e8ddd0] bg-white p-2">
                <div ref={wrapperRef} className="relative h-full min-h-[140px] w-full overflow-hidden rounded-lg border border-[#ede3d6] bg-white">
                    <canvas
                        ref={canvasRef}
                        data-no-drag="true"
                        className="h-full w-full touch-none"
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerCancel}
                        onPointerLeave={handlePointerLeave}
                    />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-[#8c7a66]">{' '}</span>
                    <span className="text-red-500">{error || ' '}</span>
                </div>
            </div>

            <Transition appear show={isClearConfirmOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setIsClearConfirmOpen(false)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-200"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-150"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-[#3b2b1f]/35" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-200"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-150"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl border border-[#e7dccf] bg-white p-6 text-left align-middle shadow-xl transition-all">
                                    <Dialog.Title as="h3" className="text-base font-semibold text-[#5a3e22]">
                                        Hapus seluruh gambar?
                                    </Dialog.Title>
                                    <p className="mt-2 text-sm text-[#7f664b]">
                                        Semua coretan di whiteboard ini akan dihapus.
                                    </p>
                                    <div className="mt-5 flex justify-end gap-2">
                                        <button
                                            type="button"
                                            data-no-drag="true"
                                            onClick={() => setIsClearConfirmOpen(false)}
                                            className="rounded-lg px-3 py-1.5 text-sm font-medium text-[#6b5a47] hover:bg-[#f7f1e8] focus:outline-none"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="button"
                                            data-no-drag="true"
                                            onClick={confirmClear}
                                            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 focus:outline-none"
                                        >
                                            Hapus
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
}
