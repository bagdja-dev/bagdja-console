import { CallbackClient } from './CallbackClient';

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const tokenParam = params.token;
  const redirectParam = params.redirect_url;

  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;
  const redirectUrl = Array.isArray(redirectParam) ? redirectParam[0] : redirectParam;

  return <CallbackClient token={token} redirectUrl={redirectUrl} />;
}