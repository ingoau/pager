import { auth } from '$lib/auth';
import type { PageLog } from './schema';
import { generateLoginCode, hashLoginCode, LOGIN_CODE_TTL_MINUTES } from './login-code';

export type ManagedUser = {
	id: string;
	name: string;
	email: string;
	status: string;
	role: string;
	allowHigh: boolean;
	reason?: string | null;
	createdAt: Date;
};

async function adapter() {
	return (await auth.$context).adapter;
}

/** Pending requests first, then everyone else, newest first within each group. */
export async function listUsers(): Promise<ManagedUser[]> {
	const users = await (
		await adapter()
	).findMany<ManagedUser>({
		model: 'user',
		sortBy: { field: 'createdAt', direction: 'desc' }
	});

	const rank = (user: ManagedUser) => (user.status === 'pending' ? 0 : 1);
	return users.sort((a, b) => rank(a) - rank(b));
}

export async function getUser(id: string): Promise<ManagedUser | null> {
	return await (
		await adapter()
	).findOne<ManagedUser>({
		model: 'user',
		where: [{ field: 'id', value: id }]
	});
}

export async function updateUser(
	id: string,
	patch: Partial<Pick<ManagedUser, 'status' | 'role' | 'allowHigh'>>
): Promise<void> {
	await (
		await adapter()
	).update({
		model: 'user',
		where: [{ field: 'id', value: id }],
		update: { ...patch, updatedAt: new Date() }
	});
}

/**
 * Remove a user along with their sessions and passkeys. Their entries in the
 * page log are deliberately left behind.
 */
export async function deleteUser(id: string): Promise<void> {
	const ctx = await auth.$context;
	await ctx.adapter.deleteMany({
		model: 'passkey',
		where: [{ field: 'userId', value: id }]
	});
	await ctx.internalAdapter.deleteUser(id);
}

/**
 * Create a user directly, the way an admin does. Deliberately identical to a
 * user who registered a passkey themselves — the only difference is that they
 * have no credential yet, which a login code solves.
 */
export async function createUser(input: {
	name: string;
	email: string;
	reason?: string;
}): Promise<{ id: string } | null> {
	const ctx = await auth.$context;
	const email = input.email.trim().toLowerCase();

	const existing = await ctx.adapter.findOne({
		model: 'user',
		where: [{ field: 'email', value: email }]
	});
	if (existing) return null;

	return (await ctx.internalAdapter.createUser(
		{
			name: input.name.trim(),
			email,
			emailVerified: false,
			reason: input.reason?.trim() || null,
			role: 'user',
			status: 'approved',
			allowHigh: false
		},
		{ method: 'admin' }
	)) as { id: string };
}

/**
 * Issue a one-time login code. Returns the plain code, which is the only time
 * it exists outside the user's hands — the row stores a hash.
 */
export async function issueLoginCode(userId: string): Promise<string> {
	const ctx = await auth.$context;

	// At most one live code per user, so issuing a new one invalidates the old.
	await ctx.adapter.deleteMany({
		model: 'loginCode',
		where: [{ field: 'userId', value: userId }]
	});

	const code = generateLoginCode();
	await ctx.adapter.create({
		model: 'loginCode',
		data: {
			userId,
			codeHash: await hashLoginCode(code),
			expiresAt: new Date(Date.now() + LOGIN_CODE_TTL_MINUTES * 60 * 1000),
			createdAt: new Date()
		}
	});

	return code;
}

export type SessionRow = {
	id: string;
	token: string;
	userId: string;
	createdAt: Date;
	expiresAt: Date;
	ipAddress?: string | null;
	userAgent?: string | null;
};

/** Every session that hasn't expired yet, across all users, newest first. */
export async function listActiveSessions(): Promise<SessionRow[]> {
	return await (
		await adapter()
	).findMany<SessionRow>({
		model: 'session',
		where: [{ field: 'expiresAt', operator: 'gt', value: new Date() }],
		sortBy: { field: 'createdAt', direction: 'desc' }
	});
}

/**
 * Look up a session by its row id.
 *
 * Session tokens are credentials, so they never leave the server: the browser
 * only ever sees the row id, and every revoke resolves it back to a token here.
 */
export async function getSessionById(id: string): Promise<SessionRow | null> {
	return await (
		await adapter()
	).findOne<SessionRow>({
		model: 'session',
		where: [{ field: 'id', value: id }]
	});
}

/**
 * Revoke one session, whoever it belongs to. Admin-only — the account page
 * goes through better-auth's own endpoint, which is scoped to the caller.
 */
export async function revokeSessionById(id: string): Promise<SessionRow | null> {
	const session = await getSessionById(id);
	if (!session) return null;

	const ctx = await auth.$context;
	await ctx.internalAdapter.deleteSession(session.token);
	return session;
}

/** Drop every session a user holds, so a revoked account loses access at once. */
export async function revokeSessions(id: string): Promise<void> {
	const ctx = await auth.$context;
	// better-auth 1.7 split these: deleteSessions now takes session tokens, and
	// deleteUserSessions is the one that clears every session for a user.
	await ctx.internalAdapter.deleteUserSessions(id);
}

export async function countUsers(): Promise<number> {
	return await (await adapter()).count({ model: 'user' });
}

export async function recordPage(entry: Omit<PageLog, 'id' | 'createdAt'>): Promise<void> {
	await (
		await adapter()
	).create({
		model: 'pageLog',
		data: { ...entry, createdAt: new Date() }
	});
}

export async function listPageLog(limit = 100): Promise<PageLog[]> {
	return await (
		await adapter()
	).findMany<PageLog>({
		model: 'pageLog',
		sortBy: { field: 'createdAt', direction: 'desc' },
		limit
	});
}
