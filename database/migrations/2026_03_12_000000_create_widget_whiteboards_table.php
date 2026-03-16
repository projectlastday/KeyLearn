<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('widget_whiteboards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('widget_id')->unique()->constrained('widgets')->cascadeOnDelete();
            $table->json('strokes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('widget_whiteboards');
    }
};
