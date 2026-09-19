import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/auth';

export const load: PageServerLoad = async ({ locals, request }) => {
	if (!locals.user) redirect(302, '/login');

	const passkeys = await auth.api.listPasskeys({ headers: request.headers });

	return {
		allowHigh: locals.user.allowHigh,
		passkeys: passkeys.map((passkey) => ({
			id: passkey.id,
			name: passkey.name ?? null,
			createdAt: passkey.createdAt,
			deviceType: passkey.deviceType
		}))
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
