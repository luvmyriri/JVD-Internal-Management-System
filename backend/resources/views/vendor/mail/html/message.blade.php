<x-mail::layout>
{{-- Header --}}
<x-slot:header>
<x-mail::header :url="config('app.url')">
{{ config('app.name') }}
</x-mail::header>
</x-slot:header>

{{-- Body --}}
{!! $slot !!}

{{-- Subcopy --}}
@isset($subcopy)
<x-slot:subcopy>
<x-mail::subcopy>
{!! $subcopy !!}
</x-mail::subcopy>
</x-slot:subcopy>
@endisset

{{-- Footer — shared JVD signature + confidentiality for all markdown notifications.
     Note: markdown mail cannot embed local files like the HTML templates do, so the
     DOT seal is referenced by public URL and appears once the app is served over HTTP
     with backend/public/dot-quality-seal.png present. --}}
<x-slot:footer>
<x-mail::footer>
@if(file_exists(public_path('dot-quality-seal.png')))
<img src="{{ asset('dot-quality-seal.png') }}" alt="DOT Quality Seal — Accreditation No. DOT-NCR-TTA-02903-2024" height="52" style="display:block;margin:0 auto 16px auto;height:52px;max-width:100%;">
@endif

<strong>JVD EVENT AND TRAVEL MANAGEMENT, COMPANY</strong><br>
Unit 6 – Aryanna Village Center, Brgy. 175, Susano Road, Camarin, Caloocan City, Philippines<br>
(02) 8652–7325 • 0981 328 0075 • 0975 058 0829<br>
<a href="mailto:jvdclassic@gmail.com">jvdclassic@gmail.com</a> • <a href="mailto:jvdmarketing8@gmail.com">jvdmarketing8@gmail.com</a><br>
<a href="https://www.facebook.com/JVDeventandtravel/">Facebook</a> • <a href="https://webstore.paynamics.net/jvdetmc">Online Payment Portal</a>

<span style="font-size:10px;color:#9ca3af;"><strong>CONFIDENTIALITY NOTICE:</strong> The contents of this email message and any attachments are intended solely for the addressee(s) and may contain confidential and/or privileged information and may be legally protected from disclosure. If you are not the intended recipient of this message or their agent, or if this message has been addressed to you in error, please immediately alert the sender by reply email and then delete this message and any attachments. If you are not the intended recipient, you are hereby notified that any use, dissemination, copying, or storage of this message or its attachments is strictly prohibited.</span>

© {{ date('Y') }} {{ config('app.name') }}. {{ __('All rights reserved.') }}
</x-mail::footer>
</x-slot:footer>
</x-mail::layout>
