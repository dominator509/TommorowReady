import Link from 'next/link';
import { SignInForm } from '../components/SignInForm';

export default function SignInPage() {
  return (
    <main id="main" className="narrow-page">
      <p className="eyebrow">Private household access</p>
      <h1 className="page-title">Sign in to your continuity plan.</h1>
      <p className="lede">Sessions are short-lived and kept in a protected browser cookie.</p>
      <SignInForm />
      <p>
        <Link href="/recover">Forgot your password?</Link>
      </p>
    </main>
  );
}
