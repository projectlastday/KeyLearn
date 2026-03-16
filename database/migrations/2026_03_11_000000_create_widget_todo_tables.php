<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('widget_todo_statuses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('widget_id')->constrained('widgets')->cascadeOnDelete();
            $table->string('name', 80);
            $table->boolean('is_system')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['widget_id', 'sort_order']);
            $table->unique(['widget_id', 'name']);
        });

        Schema::create('widget_todo_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('widget_id')->constrained('widgets')->cascadeOnDelete();
            $table->foreignId('status_id')->constrained('widget_todo_statuses')->cascadeOnDelete();
            $table->string('content', 500);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['widget_id', 'sort_order']);
            $table->index(['widget_id', 'status_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('widget_todo_items');
        Schema::dropIfExists('widget_todo_statuses');
    }
};
