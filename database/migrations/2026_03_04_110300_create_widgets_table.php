<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('widgets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('type', 30);
            $table->string('title', 100);
            $table->string('size_preset', 1)->default('M');
            $table->unsignedSmallInteger('grid_x')->default(1);
            $table->unsignedSmallInteger('grid_y')->default(1);
            $table->unsignedSmallInteger('grid_w')->default(6);
            $table->unsignedSmallInteger('grid_h')->default(2);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['workspace_id', 'deleted_at']);
            $table->index(['workspace_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('widgets');
    }
};
