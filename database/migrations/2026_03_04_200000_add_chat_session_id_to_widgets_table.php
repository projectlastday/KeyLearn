<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('widgets', function (Blueprint $table) {
            $table->foreignId('chat_session_id')
                ->nullable()
                ->after('created_by')
                ->constrained('chat_sessions')
                ->nullOnDelete();

            $table->unique('chat_session_id');
        });
    }

    public function down(): void
    {
        Schema::table('widgets', function (Blueprint $table) {
            $table->dropUnique(['chat_session_id']);
            $table->dropConstrainedForeignId('chat_session_id');
        });
    }
};
