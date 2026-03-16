<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workspace_open_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
            $table->dateTime('opened_at');
            $table->index(['workspace_id', 'opened_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workspace_open_events');
    }
};
