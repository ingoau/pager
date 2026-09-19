import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/auth';

export const load: PageServerLoad = async ({ locals, request }) => {
	if (!locals.user) redirect(302, '/login');

	const [passkeys, sessions] = await Promise.all([
		auth.api.listPasskeys({ headers: request.headers }),
		auth.api.listSessions({ headers: request.headers })
	]);

	const currentToken = locals.session?.token;

	return {
		allowHigh: locals.user.allowHigh,
		passkeys: passkeys.map((passkey) => ({
			id: passkey.id,
			name: passkey.name ?? null,
			createdAt: passkey.createdAt,
			deviceType: passkey.deviceType
		})),
		sessions: sessions
			.map((session) => ({
				id: session.id,
				token: session.token,
				createdAt: session.createdAt,
				expiresAt: session.expiresAt,
				ipAddress: session.ipAddress ?? null,
				userAgent: session.userAgent ?? null,
				current: session.token === currentToken
			}))
			.sort((a, b) => Number(b.current) - Number(a.current))
	};
};

export const actions = {
	rename: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Not signed in.' });

		const formData = await request.formData();
		const id = formData.get('id')?.toString() ?? '';
		const name = formData.get('name')?.toString().trim() ?? '';

		if (!id) return fail(400, { error: 'Missing passkey.' });
		if (!name || name.length > 60) return fail(400, { error: 'Name must be 1-60 characters.' });

		// better-auth scopes this to the caller's own passkeys.
		await auth.api.updatePasskey({ headers: request.headers, body: { id, name } });
		return { success: true };
	},

	revokeSession: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Not signed in.' });

		const formData = await request.formData();
		const token = formData.get('token')?.toString() ?? '';
		if (!token) return fail(400, { error: 'Missing session.' });

		// better-auth only revokes tokens belonging to the caller, so a forged
		// token from another account is a no-op rather than a hijack.
		await auth.api.revokeSession({ headers: request.headers, body: { token } });

		// Revoking the session you are using signs you out.
		if (token === locals.session?.token) redirect(302, '/login');

		return { success: true };
	},

	remove: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Not signed in.' });

		const formData = await request.formData();
		const id = formData.get('id')?.toString() ?? '';
		if (!id) return fail(400, { error: 'Missing passkey.' });

		const passkeys = await auth.api.listPasskeys({ headers: request.headers });
		if (passkeys.length <= 1) {
			// Removing the last one would lock the account out permanently, since
			// passkeys are the only credential type here.
			return fail(400, { error: 'You need at least one passkey.' });
		}

		await auth.api.deletePasskey({ headers: request.headers, body: { id } });
		return { success: true };
	}
} satisfies Actions;
