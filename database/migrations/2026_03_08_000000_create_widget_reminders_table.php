<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('widget_reminders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('widget_id')->constrained('widgets')->cascadeOnDelete();
            $table->text('message');
            $table->dateTime('remind_at');
            $table->string('timezone', 64)->default('Asia/Jakarta');
            $table->boolean('send_whatsapp')->default(false);
            $table->dateTime('triggered_at')->nullable();
            $table->dateTime('in_app_seen_at')->nullable();
            $table->dateTime('whatsapp_sent_at')->nullable();
            $table->unsignedSmallInteger('whatsapp_attempt_count')->default(0);
            $table->dateTime('last_whatsapp_attempt_at')->nullable();
            $table->text('whatsapp_last_error')->nullable();
            $table->timestamps();

            $table->index(['widget_id', 'remind_at']);
            $table->index(['triggered_at', 'in_app_seen_at']);
            $table->index(['send_whatsapp', 'whatsapp_sent_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('widget_reminders');
    }
};
