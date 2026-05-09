import { getRequestEvent } from '$app/server';
import { BETTER_AUTH_SECRET, BETTER_AUTH_URL, DATABASE_URL } from '$env/static/private';
import { betterAuth } from 'better-auth';
import { passkey } from '@better-auth/passkey';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { Pool } from 'pg';

export const auth = betterAuth({
	baseURL: BETTER_AUTH_URL,
	secret: BETTER_AUTH_SECRET,
	database: new Pool({
		connectionString: DATABASE_URL,
		ssl: {
			rejectUnauthorized: false
		}
	}),
	plugins: [
		passkey(),
		sveltekitCookies(getRequestEvent) // make sure this is at the end
	]
});
