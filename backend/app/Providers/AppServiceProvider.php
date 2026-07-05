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
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

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
        \Illuminate\Database\Eloquent\Model::shouldBeStrict(!app()->isProduction());
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });

        Gate::policy(PurchaseOrder::class, PurchaseOrderPolicy::class);
        Gate::policy(JobOrder::class, JobOrderPolicy::class);
        Gate::policy(User::class, UserPolicy::class);

        // Polymorphic Morph Map alignment for Accreditations
        \Illuminate\Database\Eloquent\Relations\Relation::morphMap([
            'supplier' => \App\Models\Supplier::class,
            'bus'      => \App\Models\Bus::class,
            'driver'   => User::class,
        ]);

        \App\Models\CollectionPayment::observe(\App\Observers\CollectionPaymentObserver::class);
    }
}

