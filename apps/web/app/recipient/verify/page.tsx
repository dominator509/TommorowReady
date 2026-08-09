import { RecipientVerification } from '../../components/RecipientVerification';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

export default async function RecipientVerifyPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await props.searchParams;
  const value = (key: string) => (typeof query[key] === 'string' ? query[key] : '');
  return (
    <main id="main">
      <RecipientVerification
        tenantId={value('tenantId')}
        householdId={value('householdId')}
        profileId={value('profileId')}
        token={value('token')}
      />
    </main>
  );
}
