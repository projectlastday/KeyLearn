<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('widget_youtubes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('widget_id')->unique()->constrained('widgets')->cascadeOnDelete();
            $table->string('source_url', 500);
            $table->string('video_id', 20);
            $table->timestamps();

            $table->index('video_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('widget_youtubes');
    }
};
