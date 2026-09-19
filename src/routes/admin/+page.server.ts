import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	deleteUser,
	getUser,
	listPageLog,
	listUsers,
	revokeSessions,
	updateUser
} from '$lib/server/store';

/**
 * hooks.server.ts already keeps non-admins out of /admin, but every entry point
 * here re-checks so the actions are safe on their own.
 */
function requireAdmin(locals: App.Locals) {
	const user = locals.user;
	if (!user || user.role !== 'admin' || user.status !== 'approved') {
		error(403, 'Admins only.');
	}
	return user;
}

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals);

	const [users, log] = await Promise.all([listUsers(), listPageLog(100)]);

	return { users, log };
};

/** Shared preamble: check admin, read the target id, refuse self-targeting. */
async function target(locals: App.Locals, request: Request) {
	const admin = requireAdmin(locals);
	const formData = await request.formData();
	const id = formData.get('id')?.toString() ?? '';

	if (!id) return { error: fail(400, { error: 'Missing user.' }) } as const;
	if (id === admin.id) {
		// Without this an admin could approve-flip or delete themselves and lock
		// everyone out of the panel.
		return { error: fail(400, { error: 'Not on your own account.' }) } as const;
	}

	const user = await getUser(id);
	if (!user) return { error: fail(404, { error: 'No such user.' }) } as const;

	return { id, user, formData } as const;
}

export const actions = {
	approve: async ({ locals, request }) => {
		const result = await target(locals, request);
		if ('error' in result) return result.error;

		await updateUser(result.id, { status: 'approved' });
		return { success: `Approved ${result.user.email}.` };
	},

	reject: async ({ locals, request }) => {
		const result = await target(locals, request);
		if ('error' in result) return result.error;

		await updateUser(result.id, { status: 'rejected', allowHigh: false });
		// Drop any live session so the block takes effect immediately.
		await revokeSessions(result.id);
		return { success: `Rejected ${result.user.email}.` };
	},

	setHigh: async ({ locals, request }) => {
		const result = await target(locals, request);
		if ('error' in result) return result.error;

		const allowHigh = result.formData.get('allowHigh') === 'true';
		await updateUser(result.id, { allowHigh });
		return {
			success: `${allowHigh ? 'Granted' : 'Revoked'} high priority for ${result.user.email}.`
		};
	},

	remove: async ({ locals, request }) => {
		const result = await target(locals, request);
		if ('error' in result) return result.error;

		await deleteUser(result.id);
		return { success: `Deleted ${result.user.email}.` };
	}
} satisfies Actions;
