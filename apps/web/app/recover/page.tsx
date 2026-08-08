import Link from 'next/link';
import { RecoveryForm } from '../components/RecoveryForm';

export default function RecoveryPage() {
  return (
    <main id="main" className="narrow-page">
      <p className="eyebrow">Account recovery</p>
      <h1 className="page-title">Recover your access.</h1>
      <p className="lede">Recovery links are single-use and expire after 30 minutes.</p>
      <RecoveryForm />
      <p>
        <Link href="/sign-in">Return to sign in</Link>
      </p>
    </main>
  );
}
