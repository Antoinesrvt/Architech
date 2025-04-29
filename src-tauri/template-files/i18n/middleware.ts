// These are intentionally left with type errors as they'll be resolved
// when the next-intl package is installed in the generated project
import createMiddleware from 'next-intl/middleware';
import config from './i18n.config';

export default createMiddleware({
  // A list of all locales that are supported
  locales: config.locales,
  
  // Used when no locale matches
  defaultLocale: config.defaultLocale,
  
  // Paths that don't require locale detection
  localePrefix: 'as-needed',
});

export const middleware_config = {
  // Match only internationalized pathnames
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
}; 