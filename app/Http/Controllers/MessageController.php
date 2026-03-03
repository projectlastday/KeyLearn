<?php

namespace App\Http\Controllers;

use App\Models\ChatSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class MessageController extends Controller
{
    public function store(Request $request, ChatSession $chatSession): JsonResponse
    {
        $workspace = $chatSession->workspace;
        abort_unless($workspace->user_id === $request->user()->id, 403);

        $request->validate([
            'message' => 'nullable|string',
            'file' => 'nullable|file|mimes:pdf|max:10240',
            'model' => 'nullable|string',
        ]);

        $message = trim((string) $request->input('message', ''));
        $uploadedFile = $request->file('file');

        if ($message === '' && !$uploadedFile) {
            return response()->json(['reply' => 'Pesan atau file PDF wajib diisi.'], 422);
        }

        $model = $request->input('model', 'gemini-2.5-flash');
        $allowedModels = ['gemini-2.5-flash', 'llama-3.3-70b-versatile', 'deepseek/deepseek-r1:free'];
        if (!in_array($model, $allowedModels, true)) {
            $model = 'gemini-2.5-flash';
        }

        $userMessage = $chatSession->messages()->create([
            'role' => 'user',
            'content' => $message ?: '[PDF dikirim]',
        ]);

        $previousMessages = $chatSession->messages()
            ->where('id', '!=', $userMessage->id)
            ->orderBy('created_at', 'asc')
            ->take(20)
            ->get();

        $contents = [];
        foreach ($previousMessages as $prev) {
            $role = $prev->role === 'assistant' ? 'model' : 'user';
            $contents[] = [
                'role' => $role,
                'parts' => [['text' => $prev->content]],
            ];
        }

        $currentParts = [];
        if ($message !== '') {
            $currentParts[] = ['text' => $message];
        } elseif ($uploadedFile) {
            $currentParts[] = ['text' => 'Ringkas isi dokumen PDF ini dalam Bahasa Indonesia dan jelaskan poin terpentingnya.'];
        }

        if ($uploadedFile) {
            $filePath = $uploadedFile->getRealPath();
            if (!$filePath || !is_readable($filePath)) {
                return response()->json([
                    'reply' => 'File PDF tidak dapat dibaca. Silakan unggah ulang file Anda.',
                ], 422);
            }

            $fileContents = @file_get_contents($filePath);
            if ($fileContents === false) {
                return response()->json([
                    'reply' => 'Gagal memproses file PDF. Silakan coba lagi.',
                ], 422);
            }

            $currentParts[] = [
                'inline_data' => [
                    'mime_type' => $uploadedFile->getMimeType() ?: 'application/pdf',
                    'data' => base64_encode($fileContents),
                ],
            ];
        }

        $contents[] = [
            'role' => 'user',
            'parts' => $currentParts,
        ];

        $reply = '';
        if ($model === 'gemini-2.5-flash') {
            $apiKey = env('GEMINI_API_KEY');
            if (!$apiKey) {
                return $this->errorResponse($chatSession, $userMessage, 'API Key Gemini belum dikonfigurasi', $model);
            }

            $response = Http::timeout(120)->post('https://generativelanguage.googleapis.com/v1beta/models/' . $model . ':generateContent?key=' . $apiKey, [
                'contents' => $contents,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                $replyParts = data_get($data, 'candidates.0.content.parts', []);
                $reply = collect($replyParts)->pluck('text')->filter()->implode("\n");
            } else {
                $reply = 'Error Gemini Native: ' . (data_get($response->json(), 'error.message') ?: $response->body());
            }
        } elseif (str_contains($model, 'llama-3.3')) {
            $apiKey = env('GROQ_API_KEY');
            if (!$apiKey) {
                return $this->errorResponse($chatSession, $userMessage, 'API Key Groq belum dikonfigurasi', $model);
            }

            $messages = [];
            foreach ($contents as $content) {
                $messages[] = [
                    'role' => $content['role'] === 'model' ? 'assistant' : 'user',
                    'content' => $content['parts'][0]['text'] ?? '',
                ];
            }

            $response = Http::timeout(120)
                ->withToken($apiKey)
                ->post('https://api.groq.com/openai/v1/chat/completions', [
                    'model' => $model,
                    'messages' => $messages,
                ]);

            if ($response->successful()) {
                $reply = data_get($response->json(), 'choices.0.message.content', '');
            } else {
                $reply = 'Error Groq: ' . (data_get($response->json(), 'error.message') ?: $response->body());
            }
        } else {
            // All other models (OpenRouter)
            $apiKey = env('OPENROUTER_API_KEY');
            if (!$apiKey) {
                return $this->errorResponse($chatSession, $userMessage, 'API Key OpenRouter belum dikonfigurasi', $model);
            }

            $messages = [];
            foreach ($contents as $content) {
                $messages[] = [
                    'role' => $content['role'] === 'model' ? 'assistant' : 'user',
                    'content' => $content['parts'][0]['text'] ?? '',
                ];
            }

            $response = Http::timeout(120)
                ->withToken($apiKey)
                ->withHeaders([
                    'HTTP-Referer' => config('app.url'),
                    'X-Title' => 'KeyLearn',
                ])
                ->post('https://openrouter.ai/api/v1/chat/completions', [
                    'model' => $model,
                    'messages' => $messages,
                ]);

            if ($response->successful()) {
                $reply = data_get($response->json(), 'choices.0.message.content', '');
            } else {
                $reply = 'Error OpenRouter: ' . (data_get($response->json(), 'error.message') ?: $response->body());
            }
        }

        if (!$reply) {
            $reply = 'Maaf, saya tidak dapat memproses permintaan ini.';
        }

        $aiMessage = $chatSession->messages()->create([
            'role' => 'assistant',
            'content' => $reply,
            'ai_model_used' => $model,
        ]);

        $chatSession->touch();

        return response()->json([
            'user_message' => [
                'id' => $userMessage->id,
                'role' => $userMessage->role,
                'content' => $userMessage->content,
            ],
            'reply' => $reply,
            'ai_message' => [
                'id' => $aiMessage->id,
                'role' => $aiMessage->role,
            ],
        ]);
    }
    private function errorResponse($chatSession, $userMessage, $content, $model): JsonResponse
    {
        $aiMessage = $chatSession->messages()->create([
            'role' => 'assistant',
            'content' => $content,
            'ai_model_used' => $model,
        ]);

        return response()->json([
            'user_message' => [
                'id' => $userMessage->id,
                'role' => $userMessage->role,
                'content' => $userMessage->content,
            ],
            'reply' => $aiMessage->content,
            'ai_message' => [
                'id' => $aiMessage->id,
                'role' => $aiMessage->role,
                'content' => $aiMessage->content,
            ],
        ]);
    }
}
