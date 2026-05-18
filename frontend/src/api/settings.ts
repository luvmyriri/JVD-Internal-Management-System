import client from './client';

export interface PublicSettings {
  landing_page_logo: string;
  landing_page_bg: string[];
  landing_page_btn_color: string;
  landing_page_slide_duration: number;
  landing_page_title: string;
  landing_page_slide_transition: string;
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
};
