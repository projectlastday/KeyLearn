<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\Widget;
use App\Models\WidgetTimerSession;
use App\Models\Workspace;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StatisticsController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $timezone = (string) config('app.timezone', 'Asia/Jakarta');
        $currentMonth = now($timezone)->startOfMonth();
        $selectedMonth = $this->resolveSelectedMonth((string) $request->query('month', ''), $timezone, $currentMonth);
        $monthStart = CarbonImmutable::instance($selectedMonth);
        $monthEnd = $monthStart->addMonth();
        $workspaceIds = Workspace::withTrashed()
            ->where('user_id', $user->id)
            ->pluck('id');
        $currentWorkspaceIds = $user->workspaces()->select('id');

        return Inertia::render('Statistics/Index', [
            'selectedMonth' => $monthStart->format('Y-m'),
            'availableMonths' => $this->buildAvailableMonths($user->created_at, $currentMonth, $timezone),
            'stats' => [
                'totalTopics' => $user->topics()->count(),
                'totalWorkspaces' => $user->workspaces()->count(),
                'totalActiveWidgets' => Widget::query()
                    ->whereIn('workspace_id', $currentWorkspaceIds)
                    ->count(),
                'widgetsCreatedInMonth' => Widget::withTrashed()
                    ->whereIn('workspace_id', $workspaceIds)
                    ->where('created_at', '>=', $monthStart)
                    ->where('created_at', '<', $monthEnd)
                    ->count(),
                'userMessagesSentInMonth' => Message::query()
                    ->where('role', 'user')
                    ->whereHas('chatSession.workspace', fn ($query) => $query->withTrashed()->where('user_id', $user->id))
                    ->where('created_at', '>=', $monthStart)
                    ->where('created_at', '<', $monthEnd)
                    ->count(),
                'timerDurationInMonthSeconds' => $this->sumTimerDurationForMonth($workspaceIds, $monthStart, $monthEnd, $timezone),
                'newTimersInMonth' => Widget::withTrashed()
                    ->whereIn('workspace_id', $workspaceIds)
                    ->where('type', 'timer')
                    ->where('created_at', '>=', $monthStart)
                    ->where('created_at', '<', $monthEnd)
                    ->count(),
            ],
        ]);
    }

    private function resolveSelectedMonth(string $value, string $timezone, \Carbon\CarbonInterface $currentMonth): \Carbon\CarbonInterface
    {
        if (preg_match('/^\d{4}-\d{2}$/', $value) === 1) {
            try {
                return CarbonImmutable::createFromFormat('Y-m', $value, $timezone)->startOfMonth();
            } catch (\Throwable) {
            }
        }

        return CarbonImmutable::instance($currentMonth);
    }

    private function buildAvailableMonths($userCreatedAt, \Carbon\CarbonInterface $currentMonth, string $timezone): array
    {
        $startMonth = $userCreatedAt
            ? CarbonImmutable::parse($userCreatedAt, $timezone)->startOfMonth()
            : CarbonImmutable::instance($currentMonth);
        $cursor = CarbonImmutable::instance($currentMonth);
        $months = [];

        while ($cursor->greaterThanOrEqualTo($startMonth)) {
            $months[] = [
                'value' => $cursor->format('Y-m'),
                'label' => ucfirst($cursor->locale('id')->translatedFormat('F Y')),
            ];
            $cursor = $cursor->subMonth();
        }

        return $months;
    }

    private function sumTimerDurationForMonth($workspaceIds, CarbonImmutable $monthStart, CarbonImmutable $monthEnd, string $timezone): int
    {
        $now = CarbonImmutable::now($timezone);

        return WidgetTimerSession::query()
            ->whereHas('widget.workspace', fn ($query) => $query->withTrashed()->whereIn('id', $workspaceIds))
            ->where('started_at', '<', $monthEnd)
            ->where(function ($query) use ($monthStart) {
                $query->whereNull('ended_at')
                    ->orWhere('ended_at', '>', $monthStart);
            })
            ->get(['started_at', 'ended_at'])
            ->sum(function (WidgetTimerSession $session) use ($monthEnd, $monthStart, $now) {
                $sessionStart = CarbonImmutable::parse($session->started_at)->max($monthStart);
                $sessionEnd = CarbonImmutable::parse($session->ended_at ?? $now)->min($monthEnd);

                return max(0, $sessionStart->diffInSeconds($sessionEnd, false));
            });
    }
}
