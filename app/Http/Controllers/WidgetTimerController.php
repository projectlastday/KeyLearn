<?php

namespace App\Http\Controllers;

use App\Models\Widget;
use App\Models\WidgetTimer;
use App\Models\WidgetTimerSession;
use App\Support\WidgetData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WidgetTimerController extends Controller
{
    public function run(Request $request, Widget $widget): JsonResponse
    {
        $timer = $this->authorizeTimerWidget($request, $widget);

        if (!$timer->is_running) {
            $startedAt = now('Asia/Jakarta');
            $timer->update([
                'is_running' => true,
                'started_at' => $startedAt,
            ]);

            $widget->timerSessions()->create([
                'started_at' => $startedAt,
            ]);
        }

        return response()->json(WidgetData::timer($timer->fresh()));
    }

    public function stop(Request $request, Widget $widget): JsonResponse
    {
        $timer = $this->authorizeTimerWidget($request, $widget);

        if ($timer->is_running && $timer->started_at) {
            $endedAt = now('Asia/Jakarta');
            $elapsedDelta = $timer->started_at->diffInSeconds($endedAt);
            $nextElapsed = max(0, (int) $timer->elapsed_seconds + max(0, $elapsedDelta));

            $timer->update([
                'elapsed_seconds' => $nextElapsed,
                'is_running' => false,
                'started_at' => null,
            ]);

            $this->closeActiveSession($widget, $timer->started_at, $endedAt);
        } elseif ($timer->is_running) {
            $timer->update([
                'is_running' => false,
                'started_at' => null,
            ]);
        }

        return response()->json(WidgetData::timer($timer->fresh()));
    }

    public function reset(Request $request, Widget $widget): JsonResponse
    {
        $timer = $this->authorizeTimerWidget($request, $widget);
        $resetAt = now('Asia/Jakarta');

        if ($timer->is_running && $timer->started_at) {
            $this->closeActiveSession($widget, $timer->started_at, $resetAt);
        }

        $timer->update([
            'elapsed_seconds' => 0,
            'is_running' => false,
            'started_at' => null,
        ]);

        return response()->json(WidgetData::timer($timer->fresh()));
    }

    private function authorizeTimerWidget(Request $request, Widget $widget): WidgetTimer
    {
        $workspace = $widget->workspace;
        abort_unless($workspace && $workspace->user_id === $request->user()->id, 403);

        if ($widget->type !== 'timer') {
            abort(response()->json([
                'message' => 'Widget ini bukan tipe timer.',
            ], 422));
        }

        return $widget->timer()->firstOrCreate(
            ['widget_id' => $widget->id],
            ['elapsed_seconds' => 0, 'is_running' => false]
        );
    }

    private function closeActiveSession(Widget $widget, $startedAt, $endedAt): void
    {
        $activeSession = $widget->timerSessions()
            ->whereNull('ended_at')
            ->first();

        if ($activeSession) {
            $activeSession->update([
                'ended_at' => $endedAt,
            ]);

            return;
        }

        if ($startedAt) {
            WidgetTimerSession::create([
                'widget_id' => $widget->id,
                'started_at' => $startedAt,
                'ended_at' => $endedAt,
            ]);
        }
    }
}
