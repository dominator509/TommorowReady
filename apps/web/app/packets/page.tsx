import { PacketCenter } from '../components/PacketCenter';

export default function PacketsPage() {
  return (
    <main id="main">
      <p className="eyebrow">Compartmentalized access</p>
      <h1 className="page-title">Packets and emergency release</h1>
      <p className="lede">
        Each packet is bound to one recipient, one purpose, and one approved manifest.
      </p>
      <PacketCenter />
    </main>
  );
}
