// These are intentionally left with type errors as they'll be resolved
// when the next-intl package is installed in the generated project
import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';
import config from '../i18n.config';

// This function can be used to determine if a locale is supported
export function isValidLocale(locale: string): boolean {
  return config.locales.includes(locale);
}

// For app router
export default getRequestConfig(async ({ locale }: { locale: string }) => {
  // Check if the locale is supported
  if (!isValidLocale(locale)) {
    notFound();
  }

  return {
    messages: (await import(`../messages/${locale}.json`)).default
  };
}); 