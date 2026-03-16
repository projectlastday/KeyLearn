<?php

namespace App\Services;

use App\Models\WidgetReminder;
use Carbon\Carbon;
use RuntimeException;

class ReminderProcessor
{
    public function __construct(private readonly FonnteClient $fonnteClient)
    {
    }

    public function process(): int
    {
        return $this->processWithStats()['triggered_count'];
    }

    public function processWithStats(): array
    {
        $processed = 0;
        $now = now('Asia/Jakarta');
        $whatsappAttempts = 0;
        $whatsappSuccess = 0;
        $whatsappFailed = 0;
        $errorReasons = [];
        $triggeredWithoutWhatsapp = 0;

        $dueItems = WidgetReminder::query()
            ->with(['widget.workspace.user'])
            ->whereNull('triggered_at')
            ->where('remind_at', '<=', $now)
            ->whereHas('widget', function ($query) {
                $query->whereNull('widgets.deleted_at')
                    ->where('type', 'reminder')
                    ->whereHas('workspace', fn ($workspaceQuery) => $workspaceQuery->whereNull('workspaces.deleted_at'));
            })
            ->orderBy('remind_at')
            ->get();

        foreach ($dueItems as $item) {
            $item->update([
                'triggered_at' => $now,
            ]);

            $processed++;

            if ($item->send_whatsapp) {
                $result = $this->attemptWhatsappSend($item, $now);
                $whatsappAttempts++;

                if ($result['success']) {
                    $whatsappSuccess++;
                } else {
                    $whatsappFailed++;
                    $errorReasons[] = $result['error'];
                }
            } else {
                $triggeredWithoutWhatsapp++;
            }
        }

        $retryItems = WidgetReminder::query()
            ->with(['widget.workspace.user'])
            ->whereNotNull('triggered_at')
            ->where('send_whatsapp', true)
            ->whereNull('whatsapp_sent_at')
            ->where('whatsapp_attempt_count', '<', 5)
            ->where(function ($query) use ($now) {
                $query->whereNull('last_whatsapp_attempt_at')
                    ->orWhere('last_whatsapp_attempt_at', '<=', $now->copy()->subMinutes(10));
            })
            ->whereHas('widget', function ($query) {
                $query->whereNull('widgets.deleted_at')
                    ->where('type', 'reminder')
                    ->whereHas('workspace', fn ($workspaceQuery) => $workspaceQuery->whereNull('workspaces.deleted_at'));
            })
            ->orderBy('remind_at')
            ->get();

        foreach ($retryItems as $item) {
            $result = $this->attemptWhatsappSend($item, $now);
            $whatsappAttempts++;

            if ($result['success']) {
                $whatsappSuccess++;
            } else {
                $whatsappFailed++;
                $errorReasons[] = $result['error'];
            }
        }

        return [
            'triggered_count' => $processed,
            'retry_candidates' => $retryItems->count(),
            'whatsapp_attempts' => $whatsappAttempts,
            'whatsapp_success' => $whatsappSuccess,
            'whatsapp_failed' => $whatsappFailed,
            'triggered_without_whatsapp' => $triggeredWithoutWhatsapp,
            'error_reasons' => array_values(array_unique(array_filter($errorReasons))),
        ];
    }

    private function attemptWhatsappSend(WidgetReminder $item, Carbon $now): array
    {
        $user = $item->widget?->workspace?->user;
        $message = $this->buildWhatsappMessage($item);

        $item->forceFill([
            'whatsapp_attempt_count' => (int) $item->whatsapp_attempt_count + 1,
            'last_whatsapp_attempt_at' => $now,
        ])->save();

        if (! $user || ! $user->phone || ! $user->hasVerifiedPhone()) {
            $error = 'Nomor WhatsApp pengguna tidak tersedia atau belum terverifikasi.';
            $item->update([
                'whatsapp_last_error' => $error,
            ]);

            return ['success' => false, 'error' => $error];
        }

        try {
            $this->fonnteClient->sendMessage($user->phone, $message);

            $item->update([
                'whatsapp_sent_at' => $now,
                'whatsapp_last_error' => null,
            ]);

            return ['success' => true, 'error' => null];
        } catch (RuntimeException $exception) {
            report($exception);

            $error = $exception->getMessage();
            $item->update([
                'whatsapp_last_error' => $error,
            ]);

            return ['success' => false, 'error' => $error];
        }
    }

    private function buildWhatsappMessage(WidgetReminder $item): string
    {
        $workspaceTitle = $item->widget?->workspace?->title ?? 'Folder';
        $widgetTitle = $item->widget?->title ?? 'Pengingat';

        return "Pengingat KeyLearn\nFolder: {$workspaceTitle}\nWidget: {$widgetTitle}\nPesan: {$item->message}";
    }
}
