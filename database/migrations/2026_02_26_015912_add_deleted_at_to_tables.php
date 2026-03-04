<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('topics', function (Blueprint $table) {
            $table->index('user_id', 'topics_user_id_index_for_soft_unique');
            $table->softDeletes();
            $table->dropUnique(['user_id', 'name']);
            $table->unique(['user_id', 'name', 'deleted_at']);
        });

        Schema::table('workspaces', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('chat_sessions', function (Blueprint $table) {
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('topics', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'name', 'deleted_at']);
            $table->unique(['user_id', 'name']);
            $table->dropSoftDeletes();
            $table->dropIndex('topics_user_id_index_for_soft_unique');
        });

        Schema::table('workspaces', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('chat_sessions', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
