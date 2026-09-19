import { createAuthEndpoint } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import { APIError } from 'better-auth/api';
import type { BetterAuthPlugin, GenericEndpointContext } from 'better-auth';
import * as z from 'zod';

/**
 * Admin-issued one-time login codes.
 *
 * A code is the only way into an account that has no passkey yet, so the plain
 * text is shown to the admin once and never stored — the database only holds a
 * hash.
 */

/** Crockford-ish base32 with I, L, O and U removed so codes are unambiguous read aloud. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const GROUPS = 3;
const GROUP_SIZE = 4;

/** 12 characters of this alphabet is 60 bits, far beyond guessing. */
export function generateLoginCode(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(GROUPS * GROUP_SIZE));
	const chars = Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]);
	return Array.from({ length: GROUPS }, (_, group) =>
		chars.slice(group * GROUP_SIZE, (group + 1) * GROUP_SIZE).join('')
	).join('-');
}

/** Strip formatting so 'abcd efgh' and 'ABCD-EFGH' are the same code. */
export function normaliseLoginCode(code: string): string {
	return code.toUpperCase().replace(/[^0-9A-Z]/g, '');
}

/**
 * A single SHA-256 is the right choice here, not a password KDF: the code is
 * 60 bits of uniform randomness, so there is no dictionary to run against it,
 * and lookup has to be a plain indexed equality check.
 */
export async function hashLoginCode(code: string): Promise<string> {
	const digest = await crypto.subtle.digest(
		'SHA-256',
		new TextEncoder().encode(normaliseLoginCode(code))
	);
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export const LOGIN_CODE_TTL_MINUTES = 15;

export const loginCodePlugin = () =>
	({
		id: 'login-code',
		schema: {
			loginCode: {
				fields: {
					userId: { type: 'string', required: true },
					/** SHA-256 of the normalised code. The code itself is never stored. */
					codeHash: { type: 'string', required: true, index: true },
					expiresAt: { type: 'date', required: true },
					createdAt: { type: 'date', required: true }
				}
			}
		},
		endpoints: {
			redeemLoginCode: createAuthEndpoint(
				'/login-code/redeem',
				{
					method: 'POST',
					body: z.object({ code: z.string() })
				},
				async (ctx: GenericEndpointContext) => {
					const invalid = () =>
						new APIError('UNAUTHORIZED', { message: 'That code is not valid.' });

					const code = normaliseLoginCode(ctx.body?.code ?? '');
					if (code.length !== GROUPS * GROUP_SIZE) throw invalid();

					const record = await ctx.context.adapter.findOne<{
						id: string;
						userId: string;
						expiresAt: Date;
					}>({
						model: 'loginCode',
						where: [{ field: 'codeHash', value: await hashLoginCode(code) }]
					});
					if (!record) throw invalid();

					// Single use: spend it whether or not the rest succeeds, so a
					// expired or orphaned code can't be retried.
					await ctx.context.adapter.delete({
						model: 'loginCode',
						where: [{ field: 'id', value: record.id }]
					});

					if (new Date(record.expiresAt) < new Date()) throw invalid();

					const user = await ctx.context.internalAdapter.findUserById(record.userId);
					if (!user) throw invalid();

					const session = await ctx.context.internalAdapter.createSession(user.id);
					if (!session) {
						throw new APIError('INTERNAL_SERVER_ERROR', { message: 'Could not sign you in.' });
					}

					await setSessionCookie(ctx, { session, user });
					return ctx.json({ status: true });
				}
			)
		}
	}) satisfies BetterAuthPlugin;
