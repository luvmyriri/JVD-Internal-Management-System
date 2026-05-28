<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $title }} — JVD Management Portal</title>
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Outfit:wght@500;700;800;900&display=swap" rel="stylesheet">
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                        outfit: ['Outfit', 'sans-serif'],
                    }
                }
            }
        }
    </script>
    <style>
        .spring-scale {
            animation: spring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes spring {
            0% { transform: scale(0.3); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
        }
    </style>
</head>
<body class="h-full bg-slate-50 dark:bg-slate-950 font-sans flex items-center justify-center p-4 relative overflow-hidden">
    
    <!-- Abstract gradient backgrounds for premium feel -->
    <div class="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/10 rounded-full blur-3xl -z-10"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-400/10 rounded-full blur-3xl -z-10"></div>

    <div class="max-w-xl w-full">
        <!-- Main Card with Premium Glassmorphism styling -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-[2.5rem] shadow-2xl p-8 md:p-10 relative overflow-hidden transition-all duration-300 hover:shadow-blue-200/30 dark:hover:shadow-blue-900/10">
            
            <div class="absolute -right-8 -top-8 w-40 h-40 bg-blue-500/5 rounded-full blur-2xl"></div>

            <div class="flex flex-col items-center text-center space-y-6">
                <!-- Status Icons -->
                @if ($status === 'success')
                    <div class="spring-scale w-20 h-20 rounded-[2rem] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-center text-emerald-500 shadow-lg shadow-emerald-100 dark:shadow-none">
                        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
                        </svg>
                    </div>
                @elseif ($status === 'warning')
                    <div class="spring-scale w-20 h-20 rounded-[2rem] bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/30 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-100 dark:shadow-none">
                        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                        </svg>
                    </div>
                @else
                    <div class="spring-scale w-20 h-20 rounded-[2rem] bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/30 flex items-center justify-center text-red-500 shadow-lg shadow-red-100 dark:shadow-none">
                        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </div>
                @endif

                <!-- Title & Message -->
                <div class="space-y-2">
                    <h1 class="font-outfit text-3xl font-black tracking-tight text-slate-900 dark:text-white">{{ $title }}</h1>
                    <p class="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                        {{ $message }}
                    </p>
                </div>

                <!-- Transaction Details Card -->
                <div class="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 text-left space-y-4">
                    <h2 class="text-[10px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-widest">Transaction Specification</h2>
                    <div class="divide-y divide-slate-100 dark:divide-slate-900 space-y-3">
                        @foreach ($details as $label => $value)
                            <div class="flex justify-between items-start pt-3 first:pt-0">
                                <span class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{{ $label }}</span>
                                <span class="text-xs font-black text-slate-800 dark:text-slate-200 text-right font-mono max-w-[240px] break-words">{!! nl2br(e($value)) !!}</span>
                            </div>
                        @endforeach
                    </div>
                </div>

                <!-- Done Actions -->
                <div class="pt-4 w-full">
                    <div class="flex flex-col sm:flex-row gap-3 items-center justify-center">
                        <a href="http://localhost:3000" class="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-200/50 dark:shadow-none transition active:scale-95 text-center">
                            Return to Dashboard
                        </a>
                        <button onclick="window.close()" class="w-full sm:w-auto px-8 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-black uppercase tracking-widest rounded-2xl transition active:scale-95 text-center">
                            Close Window
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Sleek Footer -->
        <div class="text-center mt-6 space-y-1">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">&copy; {{ date('Y') }} JVD Events & Travels Management Co.</p>
            <p class="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Secure Remote Action Endpoint Verified</p>
        </div>
    </div>
</body>
</html>
