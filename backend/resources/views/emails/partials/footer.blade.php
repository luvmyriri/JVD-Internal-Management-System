{{--
    Shared email signature footer for all system emails — matches the official JVD
    brand signature (left-aligned, DOT seal banner, red company bar, full links).
    Include with: @include('emails.partials.footer')
    Requires $message in scope (Mailables and ->view() notifications provide it) so the
    DOT Quality Seal can be embedded. The seal degrades gracefully if the file is absent —
    drop it at backend/public/dot-quality-seal.png to make it appear.
    Edit this ONE file to change the signature everywhere.
--}}
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto;">
    {{-- Dashed separator --}}
    <tr>
        <td style="padding: 0 0 16px 0;">
            <div style="border-top: 1px dashed #b0b5bd; line-height: 0; font-size: 0;">&nbsp;</div>
        </td>
    </tr>

    {{-- DOT Quality Seal accreditation banner (left-aligned) --}}
    @if(file_exists(public_path('dot-quality-seal.png')))
    <tr>
        <td align="left" style="padding: 0 0 18px 0;">
            <img src="{{ $message->embed(public_path('dot-quality-seal.png')) }}"
                 alt="DOT Quality Seal — Accreditation No. DOT-NCR-TTA-02903-2024"
                 height="60"
                 style="display: block; height: 60px; max-width: 100%; border: 0;">
        </td>
    </tr>
    @endif

    {{-- Company name — red bar --}}
    <tr>
        <td align="left" style="padding: 0 0 8px 0;">
            <span style="display: inline-block; background-color: #c0392b; color: #ffffff; font-size: 13px; font-weight: 800; letter-spacing: 0.3px; padding: 4px 10px;">
                JVD EVENT AND TRAVEL MANAGEMENT, COMPANY
            </span>
        </td>
    </tr>

    {{-- Address + contact block (left-aligned) --}}
    <tr>
        <td align="left" style="padding: 0 0 14px 0; font-size: 12px; line-height: 1.7; color: #374151;">
            <p style="margin: 0 0 10px 0;">
                Unit 6 - Aryanna Village Center &nbsp;Brgy.175, Susano Road Camarin, Caloocan City, Philippines
            </p>
            <p style="margin: 0 0 2px 0;">(02) 8652 - 7325</p>
            <p style="margin: 0 0 8px 0;">0981 328 0075 &nbsp;|&nbsp; 0975 058 0829</p>
            <p style="margin: 0 0 2px 0;">
                <a href="mailto:jvdclassic@gmail.com" style="color: #1a73e8; text-decoration: underline;">jvdclassic@gmail.com</a>
            </p>
            <p style="margin: 0 0 8px 0;">
                <a href="mailto:jvdmarketing8@gmail.com" style="color: #1a73e8; text-decoration: underline; font-weight: 700;">jvdmarketing8@gmail.com</a>
            </p>
            <p style="margin: 0 0 2px 0;">
                <a href="https://www.facebook.com/JVDeventandtravel/" style="color: #1a73e8; text-decoration: underline;">https://www.facebook.com/JVDeventandtravel/</a>
            </p>
            <p style="margin: 0;">
                <a href="https://webstore.paynamics.net/jvdetmc" style="color: #1a73e8; text-decoration: underline;">https://webstore.paynamics.net/jvdetmc</a>
            </p>
        </td>
    </tr>

    {{-- Confidentiality notice --}}
    <tr>
        <td align="left" style="padding: 14px 0 0 0; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 10px 0; font-size: 10px; line-height: 1.6; color: #9ca3af; text-align: justify;">
                <strong style="color: #6b7280;">CONFIDENTIALITY NOTICE:</strong> The contents of this email message and any
                attachments are intended solely for the addressee(s) and may contain confidential and/or privileged
                information and may be legally protected from disclosure. If you are not the intended recipient of this
                message or their agent, or if this message has been addressed to you in error, please immediately alert
                the sender by reply email and then delete this message and any attachments. If you are not the intended
                recipient, you are hereby notified that any use, dissemination, copying, or storage of this message or
                its attachments is strictly prohibited.
            </p>
            <p style="margin: 0; font-size: 10px; color: #b0b5bd;">
                &copy; {{ date('Y') }} JVD Event and Travel Management Company &nbsp;&bull;&nbsp; Automated system message
            </p>
        </td>
    </tr>
</table>
