const sections = [
  'People',
  'What We Own',
  'Documents and Locations',
  'Kids and Dependents',
  'Pets',
  'Home Playbook',
  'Wishes and Messages',
  'Packets',
  'Trusted Helpers',
  'Annual Review',
];

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
        <button type="button">Continue my plan</button>
      </header>
      <section aria-labelledby="readiness-heading" className="panel">
        <h2 id="readiness-heading">Family Readiness</h2>
        <p>
          <strong>Not yet calculated</strong> — only confirmed records count.
        </p>
        <p>Your next action: add the people who may need instructions.</p>
      </section>
      <nav aria-label="Plan sections" className="grid">
        {sections.map((section) => (
          <a href={`#${section.toLowerCase().replaceAll(' ', '-')}`} key={section}>
            {section}
            <span>Not started</span>
          </a>
        ))}
      </nav>
      <section className="notice" aria-labelledby="safety-heading">
        <h2 id="safety-heading">Important safety boundary</h2>
        <p>
          TomorrowReady is not a password manager, law firm, emergency service, or autonomous
          executor. It never releases information based only on AI or one uploaded document.
        </p>
      </section>
    </main>
  );
}
