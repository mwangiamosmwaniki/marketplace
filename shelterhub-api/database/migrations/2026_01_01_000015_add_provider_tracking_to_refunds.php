<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('refunds', function (Blueprint $table) {
            $table->string('provider_conversation_id')->nullable()->index();
            $table->string('provider_request_id')->nullable()->index();
            $table->string('provider_transaction_id')->nullable()->unique();
            $table->text('failure_reason')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('refunds', function (Blueprint $table) {
            $table->dropUnique(['provider_transaction_id']);
            $table->dropIndex(['provider_conversation_id']);
            $table->dropIndex(['provider_request_id']);
            $table->dropColumn([
                'provider_conversation_id',
                'provider_request_id',
                'provider_transaction_id',
                'failure_reason',
            ]);
        });
    }
};