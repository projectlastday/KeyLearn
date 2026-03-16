<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('widget_pdfs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('widget_id')->unique()->constrained('widgets')->cascadeOnDelete();
            $table->string('disk', 30)->default('local');
            $table->string('path');
            $table->string('original_name', 255);
            $table->string('mime_type', 100)->default('application/pdf');
            $table->unsignedBigInteger('size')->default(0);
            $table->unsignedInteger('last_page')->default(1);
            $table->timestamps();

            $table->index(['widget_id', 'last_page']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('widget_pdfs');
    }
};
