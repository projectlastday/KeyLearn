<?php

namespace App\Http\Controllers;

use App\Models\Widget;
use App\Support\WidgetData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WidgetYoutubeController extends Controller
{
    public function update(Request $request, Widget $widget): JsonResponse
    {
        $workspace = $widget->workspace;
        abort_unless($workspace && $workspace->user_id === $request->user()->id, 403);

        if ($widget->type !== 'youtube') {
            return response()->json([
                'message' => 'Widget ini bukan tipe YouTube.',
            ], 422);
        }

        $validated = $request->validate([
            'url' => 'required|string|max:500',
        ]);

        $videoId = $this->extractVideoId($validated['url']);
        if (! $videoId) {
            return response()->json([
                'message' => 'Link YouTube tidak valid. Gunakan format watch, youtu.be, atau shorts.',
            ], 422);
        }

        $canonicalUrl = "https://www.youtube.com/watch?v={$videoId}";

        $youtube = $widget->youtube()->updateOrCreate(
            ['widget_id' => $widget->id],
            [
                'source_url' => $canonicalUrl,
                'video_id' => $videoId,
            ]
        );

        return response()->json([
            'widget_id' => $widget->id,
            'youtube' => WidgetData::youtube($youtube->fresh()),
        ]);
    }

    private function extractVideoId(string $url): ?string
    {
        $parsed = parse_url(trim($url));
        $host = strtolower($parsed['host'] ?? '');
        $path = $parsed['path'] ?? '';
        $query = $parsed['query'] ?? '';

        if (str_starts_with($host, 'www.')) {
            $host = substr($host, 4);
        }

        $videoId = null;

        if ($host === 'youtu.be') {
            $segments = array_values(array_filter(explode('/', trim($path, '/'))));
            $videoId = $segments[0] ?? null;
        } elseif ($host === 'youtube.com' || $host === 'm.youtube.com') {
            if ($path === '/watch') {
                parse_str($query, $queryParams);
                $videoId = $queryParams['v'] ?? null;
            } elseif (str_starts_with($path, '/shorts/')) {
                $segments = array_values(array_filter(explode('/', trim($path, '/'))));
                $videoId = $segments[1] ?? null;
            }
        }

        if (! is_string($videoId) || ! preg_match('/^[A-Za-z0-9_-]{11}$/', $videoId)) {
            return null;
        }

        return $videoId;
    }
}
