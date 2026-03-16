<?php

namespace App\Http\Controllers;

use App\Models\Widget;
use App\Models\WidgetPdf;
use App\Support\WidgetData;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class WidgetPdfController extends Controller
{
    public function upload(Request $request, Widget $widget): JsonResponse
    {
        $this->authorizePdfWidget($request, $widget);

        $validated = $request->validate([
            'file' => 'required|file|mimes:pdf|max:10240',
        ], [
            'file.required' => 'File PDF wajib dipilih.',
            'file.file' => 'File PDF tidak valid.',
            'file.mimes' => 'Hanya file PDF yang didukung.',
            'file.max' => 'Ukuran PDF maksimal 10MB.',
            'file.uploaded' => 'Gagal mengunggah file. Batas ukuran file di server terlampaui.',
        ]);

        $file = $validated['file'];
        $disk = 'local';

        $existing = $widget->pdf()->first();
        if ($existing && $existing->path) {
            Storage::disk($existing->disk ?: $disk)->delete($existing->path);
        }

        $path = $file->store("widget-pdfs/{$request->user()->id}/{$widget->id}", $disk);

        $pdf = $widget->pdf()->updateOrCreate(
            ['widget_id' => $widget->id],
            [
                'disk' => $disk,
                'path' => $path,
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getMimeType() ?: 'application/pdf',
                'size' => $file->getSize() ?: 0,
                'last_page' => 1,
            ]
        );

        return response()->json(WidgetData::pdf($widget, $pdf));
    }

    public function showFile(Request $request, Widget $widget): StreamedResponse|JsonResponse
    {
        $this->authorizePdfWidget($request, $widget);

        $pdf = $widget->pdf()->first();
        if (! $pdf || ! $pdf->path || ! Storage::disk($pdf->disk ?: 'local')->exists($pdf->path)) {
            return response()->json([
                'message' => 'File PDF tidak ditemukan.',
            ], 404);
        }

        return Storage::disk($pdf->disk ?: 'local')->response(
            $pdf->path,
            $pdf->original_name,
            [
                'Content-Type' => $pdf->mime_type ?: 'application/pdf',
                'Content-Disposition' => 'inline; filename="'.str_replace('"', '', $pdf->original_name).'"',
                'X-Content-Type-Options' => 'nosniff',
            ]
        );
    }

    private function authorizePdfWidget(Request $request, Widget $widget): void
    {
        $workspace = $widget->workspace;
        abort_unless($workspace && $workspace->user_id === $request->user()->id, 403);
        if ($widget->type !== 'pdf') {
            throw new HttpResponseException(response()->json([
                'message' => 'Widget ini bukan tipe PDF.',
            ], 422));
        }
    }
}
