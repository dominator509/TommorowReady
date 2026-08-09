import { RecipientRelease } from '../../components/RecipientRelease';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

export default async function RecipientReleasePage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await props.searchParams;
  const value = (key: string) => (typeof query[key] === 'string' ? query[key] : '');
  return (
    <main id="main">
      <RecipientRelease
        tenantId={value('tenantId')}
        householdId={value('householdId')}
        tokenId={value('tokenId')}
        token={value('token')}
      />
    </main>
  );
}
