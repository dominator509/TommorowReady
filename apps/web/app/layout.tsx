import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = {
  title: 'TomorrowReady',
  description: 'Private, compartmentalized family continuity planning.',
};

const navigation = [
  ['Home', '/'],
  ['People', '/plan#records-heading'],
  ['What We Own', '/plan#accounts'],
  ['Documents and Locations', '/#documents-and-locations'],
  ['Kids and Dependents', '/#kids-and-dependents'],
  ['Pets', '/#pets'],
  ['Home Playbook', '/#home-playbook'],
  ['Wishes and Messages', '/#wishes-and-messages'],
  ['Packets', '/packets'],
  ['Trusted Helpers', '/#trusted-helpers'],
  ['Readiness', '/#readiness'],
  ['Annual Review', '/#annual-review'],
  ['Privacy and Settings', '/privacy'],
] as const;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        <header className="site-header">
          <a className="brand" href="/">
            TomorrowReady
          </a>
          <nav aria-label="Primary navigation">
            {navigation.map(([label, href]) => (
              <a href={href} key={label}>
                {label}
              </a>
            ))}
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
