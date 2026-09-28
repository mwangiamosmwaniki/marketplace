<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reconciliation_runs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->date('run_date');
            $table->integer('total_processed')->default(0);
            $table->integer('total_exceptions')->default(0);
            $table->string('status', 50)->default('completed');
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('reconciliation_exceptions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('reconciliation_run_id');
            $table->string('type', 80);
            $table->string('reference_id', 150);
            $table->decimal('expected_amount', 14, 2)->nullable();
            $table->decimal('actual_amount', 14, 2)->nullable();
            $table->string('status', 50)->default('open');
            $table->text('resolution_notes')->nullable();
            $table->uuid('resolved_by')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('reconciliation_run_id')->references('id')->on('reconciliation_runs')->onDelete('cascade');
            $table->foreign('resolved_by')->references('id')->on('users')->onDelete('set null');
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('actor_id')->nullable();
            $table->string('action', 100);
            $table->string('module', 80);
            $table->string('entity_type', 100);
            $table->string('entity_id', 100);
            $table->jsonb('old_values')->nullable();
            $table->jsonb('new_values')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->string('request_id', 100)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('actor_id')->references('id')->on('users')->onDelete('set null');
            $table->index('actor_id');
            $table->index('action');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('reconciliation_exceptions');
        Schema::dropIfExists('reconciliation_runs');
    }
};
