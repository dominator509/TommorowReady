import { PasskeyManager } from '../../components/PasskeyManager';

export default function SecurityPage() {
  return (
    <main id="main" className="narrow-page">
      <p className="eyebrow">Account settings</p>
      <h1 className="page-title">Security</h1>
      <p className="lede">
        Passkeys require user verification and are bound to this TomorrowReady origin.
      </p>
      <PasskeyManager />
    </main>
  );
}
