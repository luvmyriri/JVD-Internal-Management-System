import client from './client';

export interface PublicSettings {
  landing_page_logo: string;
  landing_page_bg: string[];
  landing_page_btn_color: string;
  landing_page_slide_duration: number;
  landing_page_title: string;
  landing_page_slide_transition: string;
  landing_page_documents?: { title: string; description: string; url: string }[];
  enable_2fa?: boolean;
}

export const settingsApi = {
  /**
   * Get unauthenticated landing/login page settings.
   */
  getPublicSettings: () =>
    client.get<{ status: string; data: PublicSettings }>('/public/settings'),

  /**
   * Update landing page configurations. (Super Admin only)
   */
  updateLandingPageSettings: (formData: FormData) =>
    client.post<{ status: string; message: string; data: PublicSettings }>(
      '/admin/settings/landing-page',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    ),

  /**
   * Update system-wide 2FA requirement toggle (Super Admin only)
   */
  update2FA: (enable2FA: boolean) =>
    client.post<{ status: string; message: string; enable_2fa: boolean }>(
      '/admin/settings/2fa',
      { enable_2fa: enable2FA }
    ),
};
