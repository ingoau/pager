import { getRequestEvent } from '$app/server';
import { BETTER_AUTH_SECRET, BETTER_AUTH_URL, DATABASE_URL } from '$env/static/private';
import { betterAuth } from 'better-auth';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { createAuthOptions } from './server/auth-options';

export const auth = betterAuth(
	createAuthOptions(
		{
			secret: BETTER_AUTH_SECRET,
			baseURL: BETTER_AUTH_URL,
			databaseUrl: DATABASE_URL
		},
		// sveltekitCookies must stay last in the plugin list.
		[sveltekitCookies(getRequestEvent)]
	)
);
