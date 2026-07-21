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
<div style="text-align:left;max-width:600px;margin:0 auto;">
@if(file_exists(public_path('dot-quality-seal.png')))
<img src="{{ asset('dot-quality-seal.png') }}" alt="DOT Quality Seal — Accreditation No. DOT-NCR-TTA-02903-2024" height="60" style="display:block;height:60px;max-width:100%;border:0;margin:0 0 14px 0;">
@endif

<span style="display:inline-block;background-color:#c0392b;color:#ffffff;font-size:13px;font-weight:800;letter-spacing:0.3px;padding:4px 10px;">JVD EVENT AND TRAVEL MANAGEMENT, COMPANY</span>

<p style="margin:10px 0;font-size:12px;line-height:1.7;color:#374151;">
Unit 6 - Aryanna Village Center &nbsp;Brgy.175, Susano Road Camarin, Caloocan City, Philippines<br>
(02) 8652 - 7325<br>
0981 328 0075 &nbsp;|&nbsp; 0975 058 0829<br>
<a href="mailto:jvdclassic@gmail.com" style="color:#1a73e8;">jvdclassic@gmail.com</a><br>
<a href="mailto:jvdmarketing8@gmail.com" style="color:#1a73e8;font-weight:700;">jvdmarketing8@gmail.com</a><br>
<a href="https://www.facebook.com/JVDeventandtravel/" style="color:#1a73e8;">https://www.facebook.com/JVDeventandtravel/</a><br>
<a href="https://webstore.paynamics.net/jvdetmc" style="color:#1a73e8;">https://webstore.paynamics.net/jvdetmc</a>
</p>

<p style="margin:0 0 10px 0;font-size:10px;line-height:1.6;color:#9ca3af;text-align:justify;"><strong style="color:#6b7280;">CONFIDENTIALITY NOTICE:</strong> The contents of this email message and any attachments are intended solely for the addressee(s) and may contain confidential and/or privileged information and may be legally protected from disclosure. If you are not the intended recipient of this message or their agent, or if this message has been addressed to you in error, please immediately alert the sender by reply email and then delete this message and any attachments. If you are not the intended recipient, you are hereby notified that any use, dissemination, copying, or storage of this message or its attachments is strictly prohibited.</p>

<p style="margin:0;font-size:10px;color:#b0b5bd;">© {{ date('Y') }} JVD Event and Travel Management Company • Automated system message</p>
</div>
</x-mail::footer>
</x-slot:footer>
</x-mail::layout>
