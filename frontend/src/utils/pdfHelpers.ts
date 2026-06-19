/**
 * pdfHelpers.ts
 * Shared utilities for PDF and Excel exports across JVD dashboards.
 *
 * Fixes:
 * 1. Logo loading — jsPDF cannot load images via relative path in production.
 *    loadLogoAsBase64() fetches the image and converts it to a base64 data URL.
 *
 * 2. Currency formatting — toLocaleString() inserts non-breaking Unicode spaces
 *    on some OS locales, which jsPDF renders as "±" symbols.
 *    formatCurrency() produces consistent "PHP 1,234.00" output on all systems.
 */

/**
 * Fetches a public image URL and returns it as a base64-encoded data URI.
 * Use this instead of passing a path string directly to jsPDF's addImage().
 *
 * @param url - Absolute or relative URL to the image (e.g. '/JVDlogo-removebg-preview.png')
 * @returns A base64 data URI string, or null if the fetch fails.
 */
export async function loadLogoAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('[pdfHelpers] Logo fetch failed, skipping logo in PDF.', e);
    return null;
  }
}

/**
 * Formats a number as a Philippine Peso currency string.
 * Uses a locale-safe approach that avoids Unicode non-breaking spaces,
 * which cause jsPDF to render "±" characters in the output.
 *
 * @param amount - Numeric value to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns e.g. "PHP 25,000.00"
 */
export function formatCurrency(amount: number, decimals = 2): string {
  const fixed = Math.abs(amount).toFixed(decimals);
  // Insert commas manually to guarantee consistent output cross-platform
  const [whole, dec] = fixed.split('.');
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const sign = amount < 0 ? '-' : '';
  return `${sign}PHP ${withCommas}.${dec}`;
}
