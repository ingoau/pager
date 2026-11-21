import { defineEnvVars } from '@sveltejs/kit/env';

// Server-only variables, read at build time (the equivalent of the old `$env/static/private`).
// See .env.example for what each one is for.
export const variables = defineEnvVars({
	DATABASE_URL: { static: true, description: 'Postgres connection string.' },
	BETTER_AUTH_SECRET: {
		static: true,
		description: 'Long random string used to sign sessions and WebAuthn challenges.'
	},
	BETTER_AUTH_URL: {
		static: true,
		description: 'Public origin the app is served from, with no trailing slash.'
	},
	PAGERDUTY_KEY: { static: true, description: 'PagerDuty REST API key.' },
	PAGERDUTY_SERVICE: {
		static: true,
		description: 'ID of the PagerDuty service incidents are created on.'
	},
	PAGERDUTY_FROM: {
		static: true,
		description: 'Login email of a user in your PagerDuty account (sent as the `From` header).'
	}
});
