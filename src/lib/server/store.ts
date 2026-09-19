import { auth } from '$lib/auth';
import type { PageLog } from './schema';

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
 * Revoke one session by its token, whoever it belongs to. Admin-only — the
 * account page uses better-auth's own endpoint, which is scoped to the caller.
 */
export async function revokeSessionByToken(token: string): Promise<void> {
	const ctx = await auth.$context;
	await ctx.internalAdapter.deleteSession(token);
}

/** Drop every session a user holds, so a revoked account loses access at once. */
export async function revokeSessions(id: string): Promise<void> {
	const ctx = await auth.$context;
	await ctx.internalAdapter.deleteSessions(id);
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
