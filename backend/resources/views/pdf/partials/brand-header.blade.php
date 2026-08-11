@php
    $documentCompany = $company ?? [
        'name' => 'JVD Event & Travel Management Company',
        'address' => 'Unit 6 Aryanna Village Center, Brgy. 175, Susano Road, Camarin, Caloocan City',
        'phone' => '0954 396 0802',
        'email' => 'jvdtransport8@gmail.com',
        'registration' => '912-883-911-000',
    ];
    $documentTitle = $documentTitle ?? 'Official Document';
    $documentReference = $documentReference ?? null;
    $documentDate = $documentDate ?? ($generatedAt ?? now());
@endphp
<div class="jvd-document">
    <div class="jvd-watermark"><img src="{{ public_path('JVDlogo-removebg-preview.png') }}" alt=""></div>
    <table class="jvd-header">
        <tr>
            <td class="jvd-header-logo"><img src="{{ public_path('JVDlogo-removebg-preview.png') }}" alt="JVD Event and Travel Management Company"></td>
            <td class="jvd-header-contact">
                <strong>Email:</strong> {{ $documentCompany['email'] ?? 'jvdtransport8@gmail.com' }}<br>
                <strong>Address:</strong> {{ $documentCompany['address'] }}<br>
                <strong>Phone:</strong> {{ $documentCompany['phone'] }} &nbsp; <strong>Tel:</strong> 02 8293 8068
            </td>
        </tr>
    </table>
    <table class="jvd-document-heading">
        <tr>
            <td><h1 class="jvd-document-title">{{ $documentTitle }}</h1></td>
            <td class="jvd-document-reference">
                @if($documentReference)<strong>Reference:</strong> {{ $documentReference }}<br>@endif
                <strong>Date:</strong> {{ $documentDate instanceof \DateTimeInterface ? $documentDate->format('M d, Y') : $documentDate }}
            </td>
        </tr>
    </table>
</div>
