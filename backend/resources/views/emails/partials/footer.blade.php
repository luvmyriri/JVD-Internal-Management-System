{{--
    Shared email signature footer for all system emails.
    Include with: @include('emails.partials.footer')
    Requires $message in scope (Mailables and ->view() notifications provide it) so the
    DOT Quality Seal can be embedded. The seal degrades gracefully if the file is absent —
    drop it at backend/public/dot-quality-seal.png to make it appear.
    Edit this ONE file to change the signature everywhere.
--}}
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto;">
    {{-- DOT Quality Seal accreditation banner --}}
    @if(file_exists(public_path('dot-quality-seal.png')))
    <tr>
        <td align="center" style="padding: 4px 0 20px 0;">
            <img src="{{ $message->embed(public_path('dot-quality-seal.png')) }}"
                 alt="DOT Quality Seal — Accreditation No. DOT-NCR-TTA-02903-2024"
                 height="56"
                 style="display: block; margin: 0 auto; max-width: 100%; height: 56px;">
        </td>
    </tr>
    @endif

    {{-- Dashed separator --}}
    <tr>
        <td style="padding: 0 0 18px 0;">
            <div style="border-top: 1px dashed #d1d5db; line-height: 0; font-size: 0;">&nbsp;</div>
        </td>
    </tr>

    {{-- Company signature block --}}
    <tr>
        <td align="center" style="padding: 0 0 16px 0; text-align: center;">
            <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 800; color: #111827; letter-spacing: 0.3px;">
                JVD EVENT AND TRAVEL MANAGEMENT, COMPANY
            </p>
            <p style="margin: 0 0 10px 0; font-size: 12px; line-height: 1.6; color: #6b7280;">
                Unit 6 &ndash; Aryanna Village Center, Brgy. 175, Susano Road,<br>
                Camarin, Caloocan City, Philippines
            </p>
            <p style="margin: 0 0 4px 0; font-size: 12px; line-height: 1.7; color: #6b7280;">
                (02) 8652&ndash;7325 &nbsp;&bull;&nbsp; 0981 328 0075 &nbsp;&bull;&nbsp; 0975 058 0829
            </p>
            <p style="margin: 0 0 4px 0; font-size: 12px; line-height: 1.7;">
                <a href="mailto:jvdclassic@gmail.com" style="color: #2563eb; text-decoration: none;">jvdclassic@gmail.com</a>
                &nbsp;&bull;&nbsp;
                <a href="mailto:jvdmarketing8@gmail.com" style="color: #2563eb; text-decoration: none;">jvdmarketing8@gmail.com</a>
            </p>
            <p style="margin: 0; font-size: 12px; line-height: 1.7;">
                <a href="https://www.facebook.com/JVDeventandtravel/" style="color: #2563eb; text-decoration: none;">Facebook</a>
                &nbsp;&bull;&nbsp;
                <a href="https://webstore.paynamics.net/jvdetmc" style="color: #2563eb; text-decoration: none;">Online Payment Portal</a>
            </p>
        </td>
    </tr>

    {{-- Confidentiality notice --}}
    <tr>
        <td style="padding: 16px 0 0 0; border-top: 1px solid #f0f0f0;">
            <p style="margin: 0 0 12px 0; font-size: 10px; line-height: 1.6; color: #9ca3af; text-align: justify;">
                <strong style="color: #6b7280;">CONFIDENTIALITY NOTICE:</strong> The contents of this email message and any
                attachments are intended solely for the addressee(s) and may contain confidential and/or privileged
                information and may be legally protected from disclosure. If you are not the intended recipient of this
                message or their agent, or if this message has been addressed to you in error, please immediately alert
                the sender by reply email and then delete this message and any attachments. If you are not the intended
                recipient, you are hereby notified that any use, dissemination, copying, or storage of this message or
                its attachments is strictly prohibited.
            </p>
            <p style="margin: 0; font-size: 10px; color: #b0b5bd; text-align: center;">
                &copy; {{ date('Y') }} JVD Event and Travel Management Company &nbsp;&bull;&nbsp; Automated system message
            </p>
        </td>
    </tr>
</table>
