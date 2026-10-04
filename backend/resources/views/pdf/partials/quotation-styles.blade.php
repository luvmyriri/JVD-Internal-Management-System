        @page {
            size: A4;
            margin: 12mm 15mm 22mm;
        }
        * { box-sizing: border-box; }
        body {
            font-family: 'DejaVu Sans', sans-serif;
            color: #111827;
            margin: 0;
            padding: 0;
            font-size: 9px;
            line-height: 1.45;
        }

        /* Watermark & Brand Footer Integration */
        @include('pdf.partials.brand-styles')

        /* Top Header Grid */
        .quote-header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 4px;
        }
        .quote-header-table td {
            vertical-align: top;
        }
        .brand-col {
            width: 58%;
        }
        .brand-logo {
            height: 46px;
            width: auto;
            margin-bottom: 3px;
        }
        .brand-name {
            font-size: 13px;
            font-weight: 900;
            letter-spacing: 0.5px;
            color: #111827;
            text-transform: uppercase;
            margin: 0;
            line-height: 1.1;
        }
        .brand-tagline {
            font-size: 7.5px;
            font-weight: 700;
            letter-spacing: 1.2px;
            color: #64748b;
            text-transform: uppercase;
            margin: 2px 0 6px;
        }
        .brand-details {
            font-size: 7.5px;
            color: #475569;
            line-height: 1.35;
        }

        .title-col {
            width: 42%;
            text-align: right;
        }
        .quote-title {
            font-size: 26px;
            font-weight: 900;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: #111827;
            margin: 0 0 10px;
            line-height: 1;
        }

        /* Metadata Grid */
        .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            margin-bottom: 12px;
        }
        .meta-table td {
            vertical-align: top;
            font-size: 8.5px;
            line-height: 1.5;
        }
        .meta-left {
            width: 55%;
            text-align: left;
        }
        .meta-right {
            width: 45%;
            text-align: right;
        }
        .meta-label {
            font-weight: 700;
            color: #475569;
        }
        .meta-val {
            font-weight: 900;
            color: #111827;
        }

        /* Client Section */
        .client-section {
            margin-bottom: 12px;
            font-size: 8.5px;
            line-height: 1.45;
        }
        .client-name {
            font-size: 11px;
            font-weight: 900;
            color: #111827;
            margin-bottom: 1px;
        }
        .client-company {
            font-weight: 700;
            color: #1f2937;
        }
        .client-sub {
            color: #4b5563;
        }

        /* Solid Accent Divider */
        .solid-accent-bar {
            height: 7px;
            background: #111827;
            width: 100%;
            margin: 0 0 12px;
        }

        /* Project / Package Description */
        .project-section-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
        }
        .project-section-table td {
            vertical-align: top;
        }
        .project-label-cell {
            width: 24%;
            font-size: 9.5px;
            font-weight: 900;
            color: #111827;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        .project-body-cell {
            width: 76%;
            font-size: 8.5px;
            color: #374151;
            line-height: 1.5;
        }

        /* Package Image Showcase */
        .package-showcase {
            margin-top: 8px;
            border: 1px solid #e2e8f0;
            background: #f8fafc;
            border-radius: 4px;
            padding: 8px;
        }
        .package-showcase-table {
            width: 100%;
            border-collapse: collapse;
        }
        .package-showcase-table td {
            vertical-align: middle;
        }
        .package-img-cell {
            width: 130px;
            padding-right: 12px;
            text-align: center;
        }
        .package-img {
            max-width: 125px;
            max-height: 80px;
            border-radius: 3px;
            border: 1px solid #cbd5e1;
        }
        .package-meta-title {
            font-size: 10px;
            font-weight: 900;
            color: #174a8b;
            margin-bottom: 3px;
        }
        .package-meta-detail {
            font-size: 8px;
            color: #475569;
            line-height: 1.45;
        }

        /* Table of Line Items */
        .quote-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            margin-bottom: 12px;
            border-top: 1.5px solid #111827;
            border-bottom: 1.5px solid #111827;
        }
        .quote-table th {
            padding: 8px 6px;
            font-size: 8.5px;
            font-weight: 900;
            color: #111827;
            border-bottom: 1.5px solid #111827;
            text-align: left;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        .quote-table th.right, .quote-table td.right {
            text-align: right;
        }
        .quote-table th.center, .quote-table td.center {
            text-align: center;
        }
        .quote-table td {
            padding: 8px 6px;
            border-bottom: 1px solid #e5e7eb;
            vertical-align: top;
            font-size: 8.5px;
        }
        .quote-table tr:last-child td {
            border-bottom: none;
        }
        .line-desc {
            font-weight: 700;
            color: #111827;
        }

        /* Totals Block */
        .totals-wrapper-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4px;
            margin-bottom: 16px;
        }
        .totals-spacer {
            width: 52%;
        }
        .totals-col {
            width: 48%;
            vertical-align: top;
        }
        .totals-table {
            width: 100%;
            border-collapse: collapse;
        }
        .totals-table td {
            padding: 4px 6px;
            font-size: 8.5px;
            vertical-align: middle;
        }
        .totals-label {
            font-weight: 700;
            color: #4b5563;
            text-align: left;
        }
        .totals-value {
            font-weight: 700;
            color: #111827;
            text-align: right;
            white-space: nowrap;
        }
        .total-highlight-row {
            background: #111827;
            color: #ffffff;
        }
        .total-highlight-label {
            padding: 6px 10px !important;
            font-size: 10.5px !important;
            font-weight: 900 !important;
            color: #ffffff !important;
            text-align: left;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .total-highlight-value {
            padding: 6px 10px !important;
            font-size: 11.5px !important;
            font-weight: 900 !important;
            color: #ffffff !important;
            text-align: right;
            white-space: nowrap;
        }

        /* Sign-off & Acceptance Section */
        .signoff-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #e5e7eb;
        }
        .signoff-table td {
            vertical-align: top;
        }
        .signoff-contact {
            width: 52%;
            padding-right: 15px;
            font-size: 8px;
            color: #4b5563;
            line-height: 1.5;
        }
        .signoff-thanks {
            margin-top: 8px;
            font-size: 9.5px;
            font-weight: 900;
            color: #111827;
        }
        .signoff-acceptance {
            width: 48%;
            font-size: 8px;
            color: #111827;
        }
        .signoff-prompt {
            font-weight: 700;
            margin-bottom: 26px;
        }
        .signoff-line {
            border-top: 1px solid #111827;
            padding-top: 4px;
            text-align: center;
            font-size: 7.5px;
            font-style: italic;
            color: #4b5563;
        }
