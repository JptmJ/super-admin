import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Swarnay — Platform Admin',
  description: 'Super admin console: tenants, branches, staff and module licences.',
};

/*
 * Applies the stored theme before the first paint, so a Light choice on a dark
 * device never flashes dark. The key matches THEME_KEY in components/ThemeSwitch
 * (a Server Component cannot import a value from a client module).
 */
const THEME_SCRIPT = `try{var t=localStorage.getItem('sw_theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: <html> gets data-theme from the script above,
    // and <body> gets attributes from browser extensions (ColorZilla adds
    // cz-shortcut-listen) before React hydrates. Both are expected differences.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="icon"
          type="image/svg+xml"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23C79B3B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polygon points='6 3 18 3 22 9 12 22 2 9 6 3'/></svg>"
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
