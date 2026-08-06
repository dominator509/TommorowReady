import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = {
  title: 'TomorrowReady',
  description: 'Private, compartmentalized family continuity planning.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
