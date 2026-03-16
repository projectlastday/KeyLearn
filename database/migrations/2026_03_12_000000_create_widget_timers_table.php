<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('widget_timers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('widget_id')->unique()->constrained('widgets')->cascadeOnDelete();
            $table->unsignedInteger('elapsed_seconds')->default(0);
            $table->boolean('is_running')->default(false);
            $table->dateTime('started_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('widget_timers');
    }
};
