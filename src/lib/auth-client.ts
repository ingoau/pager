import { createAuthClient } from 'better-auth/svelte';
import { passkeyClient } from '@better-auth/passkey/client';
import { deviceAuthorizationClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
	plugins: [passkeyClient(), deviceAuthorizationClient()]
});
