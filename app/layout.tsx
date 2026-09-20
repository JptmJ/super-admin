import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RatnaGrid — Platform Admin',
  description: 'Super admin console: tenants, branches, staff and module licences.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
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
      <body>{children}</body>
    </html>
  );
}
