<?php

namespace App\Providers;

use App\Models\JobOrder;
use App\Models\PurchaseOrder;
use App\Models\User;
use App\Policies\JobOrderPolicy;
use App\Policies\PurchaseOrderPolicy;
use App\Policies\UserPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     * Registers authorization policies for all major models.
     */
    public function boot(): void
    {
        Gate::policy(PurchaseOrder::class, PurchaseOrderPolicy::class);
        Gate::policy(JobOrder::class, JobOrderPolicy::class);
        Gate::policy(User::class, UserPolicy::class);
    }
}

