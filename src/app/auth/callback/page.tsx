import { CallbackClient } from './CallbackClient';

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  // OAuth 2.0 flow - receive code and state from authorization server
  const codeParam = params.code;
  const stateParam = params.state;
  
  // Legacy flow - receive token (deprecated, for backward compatibility)
  const tokenParam = params.token;
  const redirectParam = params.redirect_url;

  const code = Array.isArray(codeParam) ? codeParam[0] : codeParam;
  const state = Array.isArray(stateParam) ? stateParam[0] : stateParam;
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;
  const redirectUrl = Array.isArray(redirectParam) ? redirectParam[0] : redirectParam;

  // If code and state are present, it's OAuth flow
  // Otherwise, fall back to legacy token flow
  const isOAuthFlow = !!(code && state);

  return <CallbackClient code={code} state={state} token={token} redirectUrl={redirectUrl} isOAuthFlow={isOAuthFlow} />;
}