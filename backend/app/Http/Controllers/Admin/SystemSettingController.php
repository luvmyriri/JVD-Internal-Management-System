<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SystemSettingController extends Controller
{
    /**
     * Get unauthenticated settings for the landing/login page.
     */
    public function getPublicSettings()
    {
        $logo = SystemSetting::getValue('landing_page_logo', '/JVD 3D.png');
        $bgList = SystemSetting::getValue('landing_page_bg', ['/bus-bg.png']);
        $btnColor = SystemSetting::getValue('landing_page_btn_color', '#2563eb');
        $duration = SystemSetting::getValue('landing_page_slide_duration', 6);
        $title = SystemSetting::getValue('landing_page_title', 'JVD ETMC');
        $transition = SystemSetting::getValue('landing_page_slide_transition', 'fade');
        
        $documentsRaw = SystemSetting::getValue('landing_page_documents', '[]');
        $documents = is_string($documentsRaw) ? json_decode($documentsRaw, true) : $documentsRaw;
        if (!is_array($documents)) {
            $documents = [];
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'landing_page_logo' => $logo,
                'landing_page_bg' => is_array($bgList) ? $bgList : [$bgList],
                'landing_page_btn_color' => $btnColor,
                'landing_page_slide_duration' => intval($duration),
                'landing_page_title' => $title,
                'landing_page_slide_transition' => $transition,
                'landing_page_documents' => $documents,
            ]
        ]);
    }

    /**
     * Update landing page configurations. Restricted to Super Admin.
     */
    public function updateLandingPageSettings(\App\Http\Requests\UpdateLandingPageSettingsRequest $request)
    {
        info('Update Landing Page Settings Request:', $request->all());
        info('Uploaded files:', $request->allFiles());

        // 1. Handle Logo Upload
        if ($request->hasFile('logo_file')) {
            $file = $request->file('logo_file');
            if ($file->isValid()) {
                $logoPath = $file->store('landing_page', 'public');
                SystemSetting::setValue('landing_page_logo', Storage::url($logoPath));
                info('Saved new logo: ' . Storage::url($logoPath));
            } else {
                info('Invalid logo file upload: ' . $file->getErrorMessage());
            }
        }

        // 2. Handle Backgrounds (Slideshow)
        $bgList = [];

        // Keep chosen existing background images
        if ($request->has('existing_bg_urls')) {
            $bgList = $request->input('existing_bg_urls');
        }

        // Upload and append new background images
        if ($request->hasFile('bg_files')) {
            $files = $request->file('bg_files');
            foreach ($files as $file) {
                if ($file->isValid()) {
                    $bgPath = $file->store('landing_page', 'public');
                    $bgList[] = Storage::url($bgPath);
                    info('Saved new background frame: ' . Storage::url($bgPath));
                } else {
                    info('Invalid file upload in bg_files array');
                }
            }
        }

        // If background list became empty, restore default to prevent empty bg page
        if (empty($bgList)) {
            $bgList = ['/bus-bg.png'];
        }

        SystemSetting::setValue('landing_page_bg', $bgList);

        // 3. Handle Button Accent Color
        if ($request->has('landing_page_btn_color')) {
            SystemSetting::setValue('landing_page_btn_color', $request->input('landing_page_btn_color'));
        }

        // 4. Handle Slide Duration
        if ($request->has('landing_page_slide_duration')) {
            SystemSetting::setValue('landing_page_slide_duration', $request->input('landing_page_slide_duration'));
        }

        // 5. Handle Title
        if ($request->has('landing_page_title')) {
            SystemSetting::setValue('landing_page_title', $request->input('landing_page_title'));
        }

        // 6. Handle Transition Effect
        if ($request->has('landing_page_slide_transition')) {
            SystemSetting::setValue('landing_page_slide_transition', $request->input('landing_page_slide_transition'));
        }

        // 7. Handle Landing Page Documents
        $documents = [];
        if ($request->has('existing_documents')) {
            $existing = json_decode($request->input('existing_documents'), true);
            if (is_array($existing)) {
                $documents = $existing;
            }
        }

        if ($request->hasFile('new_document_files')) {
            $docFiles = $request->file('new_document_files');
            $docTitles = $request->input('new_document_titles', []);
            $docDescriptions = $request->input('new_document_descriptions', []);

            foreach ($docFiles as $index => $file) {
                if ($file->isValid()) {
                    $docPath = $file->store('landing_page_documents', 'public');
                    $documents[] = [
                        'title' => $docTitles[$index] ?? 'Untitled Document',
                        'description' => $docDescriptions[$index] ?? '',
                        'url' => Storage::url($docPath)
                    ];
                    info('Saved new document: ' . Storage::url($docPath));
                }
            }
        }
        SystemSetting::setValue('landing_page_documents', json_encode($documents));

        return response()->json([
            'status' => 'success',
            'message' => 'Landing page configuration updated successfully.',
            'data' => [
                'landing_page_logo' => SystemSetting::getValue('landing_page_logo', '/JVD 3D.png'),
                'landing_page_bg' => SystemSetting::getValue('landing_page_bg', ['/bus-bg.png']),
                'landing_page_btn_color' => SystemSetting::getValue('landing_page_btn_color', '#2563eb'),
                'landing_page_slide_duration' => intval(SystemSetting::getValue('landing_page_slide_duration', 6)),
                'landing_page_title' => SystemSetting::getValue('landing_page_title', 'JVD ETMC'),
                'landing_page_slide_transition' => SystemSetting::getValue('landing_page_slide_transition', 'fade'),
                'landing_page_documents' => json_decode(SystemSetting::getValue('landing_page_documents', '[]'), true) ?? [],
            ]
        ]);
    }
}
