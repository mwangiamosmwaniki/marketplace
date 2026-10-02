<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('idempotency_keys', function (Blueprint $table) {
            $table->dropUnique('idempotency_keys_user_id_idempotency_key_unique');
            $table->unique(
                ['user_id', 'idempotency_key', 'request_path'],
                'idempotency_keys_user_key_path_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::table('idempotency_keys', function (Blueprint $table) {
            $table->dropUnique('idempotency_keys_user_key_path_unique');
            $table->unique(['user_id', 'idempotency_key']);
        });
    }
};