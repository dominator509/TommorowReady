import Link from 'next/link';
import { planSections, sectionAnchor } from '@tomorrowready/ui';

const sections = planSections;

export default function HomePage() {
  return (
    <main id="main">
      <header className="hero">
        <p className="eyebrow">Private by default</p>
        <h1>Everything your family needs, before they need it.</h1>
        <p>
          Build a verified continuity plan in short, resumable sections. You control who sees each
          packet and when.
        </p>
        <Link className="primary-action" href="/plan">
          Continue my plan
        </Link>
        <Link className="secondary-action" href="/sign-in">
          Sign in securely
        </Link>
      </header>
      <section aria-labelledby="readiness-heading" className="panel" id="readiness">
        <h2 id="readiness-heading">Family Readiness</h2>
        <p>
          <strong>Not yet calculated</strong> — only confirmed records count.
        </p>
        <p>Your next action: add the people who may need instructions.</p>
      </section>
      <nav aria-label="Plan sections" className="grid">
        {sections.map((section) => (
          <a href={`#${sectionAnchor(section)}`} id={sectionAnchor(section)} key={section}>
            {section}
            <span>Not started</span>
          </a>
        ))}
      </nav>
      <section className="notice" aria-labelledby="safety-heading" id="privacy-and-settings">
        <h2 id="safety-heading">Important safety boundary</h2>
        <p>
          TomorrowReady is not a password manager, law firm, emergency service, or autonomous
          executor. It never releases information based only on AI or one uploaded document.
        </p>
      </section>
      <footer>TomorrowReady keeps drafts private and requires explicit human confirmation.</footer>
    </main>
  );
}
