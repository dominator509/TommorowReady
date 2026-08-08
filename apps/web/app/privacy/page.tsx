import Link from 'next/link';
import { PrivacyRequestForm } from '../components/PrivacyRequestForm';

export default function PrivacyPage() {
  return (
    <main id="main" className="narrow-page">
      <p className="eyebrow">Privacy and settings</p>
      <h1 className="page-title">Control your information.</h1>
      <p className="lede">
        Request access, correction, export, or deletion. Requests are recorded with status and audit
        evidence.
      </p>
      <PrivacyRequestForm />
      <p className="page-links">
        <Link href="/settings/security">Manage passkeys</Link>
        <Link href="/">Return home</Link>
      </p>
    </main>
  );
}
