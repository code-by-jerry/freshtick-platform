<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('collections', function (Blueprint $table) {
            $table->string('product_selection_mode')->default('category')->after('category_id');
            $table->string('category_selection_mode')->default('all')->after('product_selection_mode');
            $table->json('category_ids')->nullable()->after('category_selection_mode');
            $table->json('product_ids')->nullable()->after('category_ids');
            $table->unsignedInteger('random_products_limit')->default(12)->after('product_ids');
        });
    }

    public function down(): void
    {
        Schema::table('collections', function (Blueprint $table) {
            $table->dropColumn([
                'product_selection_mode',
                'category_selection_mode',
                'category_ids',
                'product_ids',
                'random_products_limit',
            ]);
        });
    }
};
