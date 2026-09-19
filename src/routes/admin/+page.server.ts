import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	createUser,
	deleteUser,
	getUser,
	issueLoginCode,
	listActiveSessions,
	listPageLog,
	listUsers,
	revokeSessionByToken,
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

	const [users, log, sessions] = await Promise.all([
		listUsers(),
		listPageLog(100),
		listActiveSessions()
	]);

	const currentToken = locals.session?.token;

	// Sessions hang off the user they belong to rather than forming their own
	// list, so the admin sees them next to the account they'd act on.
	const byUser = new Map<string, typeof sessions>();
	for (const session of sessions) {
		const existing = byUser.get(session.userId);
		if (existing) existing.push(session);
		else byUser.set(session.userId, [session]);
	}

	return {
		log,
		users: users.map((user) => ({
			...user,
			sessions: (byUser.get(user.id) ?? []).map((session) => ({
				id: session.id,
				token: session.token,
				createdAt: session.createdAt,
				expiresAt: session.expiresAt,
				ipAddress: session.ipAddress ?? null,
				userAgent: session.userAgent ?? null,
				current: session.token === currentToken
			}))
		}))
	};
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

	create: async ({ locals, request }) => {
		requireAdmin(locals);

		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim() ?? '';
		const email = formData.get('email')?.toString().trim().toLowerCase() ?? '';
		const reason = formData.get('reason')?.toString().trim() ?? '';

		if (!name || name.length > 80) return fail(400, { error: 'Name is required.' });
		if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email) || email.length > 200) {
			return fail(400, { error: 'A valid email is required.' });
		}
		if (reason.length > 500) return fail(400, { error: 'Reason is too long.' });

		const created = await createUser({ name, email, reason });
		if (!created) return fail(409, { error: 'That email already has an account.' });

		// Hand back a code straight away — the account has no credential yet, so
		// without one there is no way in.
		const code = await issueLoginCode(created.id);
		return { success: `Created ${email}.`, code, codeFor: email };
	},

	issueCode: async ({ locals, request }) => {
		const result = await target(locals, request);
		if ('error' in result) return result.error;

		const code = await issueLoginCode(result.id);
		return {
			success: `New login code for ${result.user.email}.`,
			code,
			codeFor: result.user.email
		};
	},

	revokeSession: async ({ locals, request }) => {
		requireAdmin(locals);

		const formData = await request.formData();
		const token = formData.get('token')?.toString() ?? '';
		if (!token) return fail(400, { error: 'Missing session.' });

		await revokeSessionByToken(token);

		// Admins can revoke their own session here too; that signs them out.
		if (token === locals.session?.token) redirect(302, '/login');

		return { success: 'Session revoked.' };
	},

	remove: async ({ locals, request }) => {
		const result = await target(locals, request);
		if ('error' in result) return result.error;

		await deleteUser(result.id);
		return { success: `Deleted ${result.user.email}.` };
	}
} satisfies Actions;
