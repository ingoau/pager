// See https://svelte.dev/docs/kit/types#app.d.ts

import type { auth } from '$lib/auth';

type AuthSession = typeof auth.$Infer.Session;

// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			session: AuthSession['session'] | null;
			user: AuthSession['user'] | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
