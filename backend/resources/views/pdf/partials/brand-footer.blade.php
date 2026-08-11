@php
    $footerNote = $footerNote ?? 'This is a computer-generated JVD document. Verify operational changes with the issuing department.';
@endphp
<div class="jvd-footer">
    <div class="jvd-footer-rule"></div>
    <table class="jvd-footer-content">
        <tr>
            <td class="jvd-footer-note">
                {{ $footerNote }}<br>
                Unit 6 Aryanna Village Center, Brgy. 175, Susano Road, Camarin, Caloocan City &nbsp; | &nbsp;
                DOT Accreditation No. DOT-NCR-TTA-02903-2024 &nbsp; | &nbsp; Page <span class="jvd-page-number"></span>
            </td>
            <td class="jvd-footer-seal"><img src="{{ public_path('dot-quality-seal.jpg') }}" alt="DOT Quality Seal"></td>
        </tr>
    </table>
    <div class="jvd-footer-band"></div>
</div>
