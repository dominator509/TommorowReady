import Link from 'next/link';

const steps = [
  [
    '1',
    'Add the people who may need instructions',
    'Names and roles only; sensitive details can wait.',
  ],
  [
    '2',
    'Record where important things are',
    'Store locations and retrieval guidance, never raw passwords.',
  ],
  ['3', 'Prepare a least-privilege packet', 'Choose exactly what each trusted helper may receive.'],
] as const;

export default function PlanPage() {
  return (
    <main id="main">
      <p className="eyebrow">Guided setup</p>
      <h1 className="page-title">Start with the essentials.</h1>
      <p className="lede">
        You can stop after any step. Nothing is shared until you review and approve it.
      </p>
      <ol className="steps">
        {steps.map(([number, title, detail]) => (
          <li key={number}>
            <span aria-hidden="true">{number}</span>
            <div>
              <h2>{title}</h2>
              <p>{detail}</p>
            </div>
          </li>
        ))}
      </ol>
      <section className="notice" aria-labelledby="plan-boundary">
        <h2 id="plan-boundary">Before you begin</h2>
        <p>Do not enter passwords, private keys, recovery phrases, or safe combinations.</p>
      </section>
      <Link className="primary-action" href="/#people">
        Begin with people
      </Link>
      <Link className="secondary-action" href="/">
        Return to overview
      </Link>
    </main>
  );
}
