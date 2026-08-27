<?php
/**
 * Blade view that wraps another view and sets a PDF background template.
 *
 * Expected variables:
 *   - $templateFile: filename of the PDF template located in resources/views/pdf/templates/
 *   - any additional data (e.g., $package) passed from the controller.
 */
?>
<!DOCTYPE html>
<html>
<head>
    <style>
        @page {
            margin: 0;
            background: url('{{ asset('pdf/templates/' . $templateFile) }}') no-repeat center center;
            background-size: cover;
        }
        body {
            margin: 0;
            padding: 0;
            font-family: DejaVu Sans, sans-serif;
        }
        .content {
            position: relative;
            top: 0;
            left: 0;
            width: 100%;
            padding: 20mm;
        }
    </style>
</head>
<body>
    <div class="content">
        @yield('content')
    </div>
</body>
</html>
