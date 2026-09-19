import { betterAuth, type BetterAuthOptions, type BetterAuthPlugin } from 'better-auth';
import { APIError } from 'better-auth/api';
import { passkey } from '@better-auth/passkey';
import { Pool } from 'pg';
import { pagerSchema } from './schema';

/**
 * Access request submitted alongside a passkey registration ceremony. The
 * browser passes this through the passkey plugin's `context` query parameter,
 * so it is entirely untrusted until validated here.
 */
type AccessRequest = {
	name: string;
	email: string;
	reason: string;
};

function bad(message: string): never {
	throw new APIError('BAD_REQUEST', { message });
}

function parseAccessRequest(raw: string | null | undefined): AccessRequest {
	if (!raw) bad('Tell us who you are before registering a passkey.');

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		bad('Malformed registration request.');
	}

	const { name, email, reason } = (parsed ?? {}) as Record<string, unknown>;
	const cleanName = typeof name === 'string' ? name.trim() : '';
	const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
	const cleanReason = typeof reason === 'string' ? reason.trim() : '';

	if (cleanName.length < 1 || cleanName.length > 80) bad('Name is required.');
	// Deliberately loose: nothing is emailed, the address is only an identifier
	// the admin recognises when approving.
	if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(cleanEmail) || cleanEmail.length > 200) {
		bad('A valid email address is required.');
	}
	if (cleanReason.length > 500) bad('Reason is too long.');

	return { name: cleanName, email: cleanEmail, reason: cleanReason };
}

/**
 * Managed Postgres providers generally require TLS and serve certificates the
 * default trust store doesn't cover; a local dev server usually speaks no TLS
 * at all. Pick based on the host rather than forcing one or the other.
 */
function sslFor(databaseUrl: string) {
	let hostname: string;
	try {
		hostname = new URL(databaseUrl).hostname;
	} catch {
		return { rejectUnauthorized: false };
	}

	const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
	return isLocal ? false : { rejectUnauthorized: false };
}

export type AuthEnv = {
	secret: string;
	baseURL: string;
	databaseUrl: string;
};

/**
 * The full better-auth configuration, minus anything SvelteKit-specific.
 *
 * Shared by the running app (`$lib/auth`) and the migration script, so the
 * schema the script creates always matches the schema the app expects.
 */
export function createAuthOptions(env: AuthEnv, extraPlugins: BetterAuthPlugin[] = []) {
	return {
		baseURL: env.baseURL,
		secret: env.secret,
		database: new Pool({
			connectionString: env.databaseUrl,
			ssl: sslFor(env.databaseUrl)
		}),
		user: {
			additionalFields: {
				/** 'pending' until an admin approves; only 'approved' users can page. */
				status: {
					type: 'string',
					required: false,
					defaultValue: 'pending',
					input: false
				},
				/** 'user' or 'admin'. The first account ever registered becomes admin. */
				role: {
					type: 'string',
					required: false,
					defaultValue: 'user',
					input: false
				},
				/** Whether this user may send high-urgency pages. */
				allowHigh: {
					type: 'boolean',
					required: false,
					defaultValue: false,
					input: false
				},
				/** Why they said they need to reach you, shown to the admin on approval. */
				reason: {
					type: 'string',
					required: false,
					input: false
				}
			}
		},
		rateLimit: {
			// Registration is open to the internet, so cap the ceremony endpoints
			// harder than the global default.
			enabled: true,
			customRules: {
				'/passkey/generate-register-options': { window: 60, max: 5 },
				'/passkey/verify-registration': { window: 60, max: 5 },
				'/passkey/generate-authenticate-options': { window: 60, max: 20 }
			}
		},
		plugins: [
			pagerSchema(),
			passkey({
				rpName: 'pager',
				registration: {
					// Allow registering a passkey without a session, so new people can
					// request access. When a session *does* exist the plugin prefers it,
					// which is what lets an existing user add extra passkeys.
					requireSession: false,

					// Runs before the WebAuthn ceremony. Only validates and reserves a
					// WebAuthn user handle — the user row is created in
					// `afterVerification`, so an abandoned ceremony leaves nothing behind.
					resolveUser: async ({ ctx, context }) => {
						const request = parseAccessRequest(context);

						const existing = await ctx.context.adapter.findOne({
							model: 'user',
							where: [{ field: 'email', value: request.email }]
						});
						if (existing) {
							bad(
								'That email already has an account. Sign in with your existing passkey, then add another from your account page.'
							);
						}

						return {
							id: crypto.randomUUID(),
							name: request.name,
							displayName: request.name
						};
					},

					// Runs only once the authenticator has produced a verified credential.
					afterVerification: async ({ ctx, context }) => {
						// A session here means an existing user adding another passkey;
						// the plugin already resolved them, so there is nothing to create.
						if (ctx.context.session?.user?.id) return;

						const request = parseAccessRequest(context);

						// The very first account to register claims the instance.
						const userCount = await ctx.context.adapter.count({ model: 'user' });
						const isFirstUser = userCount === 0;

						const created = (await ctx.context.internalAdapter.createUser({
							name: request.name,
							email: request.email,
							emailVerified: false,
							reason: request.reason,
							role: isFirstUser ? 'admin' : 'user',
							status: isFirstUser ? 'approved' : 'pending',
							allowHigh: isFirstUser
						})) as { id: string };

						// Two people registering at once could both have counted zero
						// above. Only the earliest row keeps admin; anyone else who tied
						// falls back to a normal pending request.
						if (isFirstUser) {
							const admins = await ctx.context.adapter.findMany<{ id: string; createdAt: Date }>({
								model: 'user',
								where: [{ field: 'role', value: 'admin' }],
								sortBy: { field: 'createdAt', direction: 'asc' }
							});
							const winner = admins[0];
							if (winner && winner.id !== created.id) {
								await ctx.context.adapter.update({
									model: 'user',
									where: [{ field: 'id', value: created.id }],
									update: { role: 'user', status: 'pending', allowHigh: false }
								});
							}
						}

						return { userId: created.id };
					}
				}
			}),
			...extraPlugins
		]
	} satisfies BetterAuthOptions;
}

/** Used by the migration script, which has no SvelteKit request context. */
export function createStandaloneAuth(env: AuthEnv) {
	return betterAuth(createAuthOptions(env));
}
