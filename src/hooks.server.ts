import { auth } from '$lib/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import { redirect, type Handle, type HandleServerError } from '@sveltejs/kit';

/**
 * Postgres and Node surface the causes we actually hit as short codes. Without
 * this the log just says "500" and you are left guessing.
 */
const CAUSE_HINTS: Record<string, string> = {
	// better-auth checks its own schema before querying
	SCHEMA_MISMATCH:
		'The database schema does not match — run `bun run db:migrate` against this database.',
	// Postgres
	'42P01': 'A table is missing — run `bun run db:migrate` against this database.',
	'42703': 'A column is missing — run `bun run db:migrate` against this database.',
	'28P01': 'Password authentication failed — check the credentials in DATABASE_URL.',
	'28000': 'The database rejected the connection — check the user and database name.',
	'3D000': 'That database does not exist — check the database name in DATABASE_URL.',
	'53300': 'The database is out of connections — use a pooled connection string.',
	// Node / TLS
	ENOTFOUND: 'The database host does not resolve — check the host in DATABASE_URL.',
	ECONNREFUSED: 'Nothing is listening on that host and port — check DATABASE_URL.',
	ETIMEDOUT: 'The database did not answer in time — check the host and any IP allowlist.',
	SELF_SIGNED_CERT_IN_CHAIN:
		'The database certificate is not trusted — see sslmode in DATABASE_URL.',
	UNABLE_TO_VERIFY_LEAF_SIGNATURE:
		'The database certificate could not be verified — see sslmode in DATABASE_URL.'
};

/** Routes reachable without an approved account. */
const PUBLIC_ROUTES = ['/login', '/register', '/pending', '/link'];

function isPublic(pathname: string) {
	return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export const handle: Handle = async ({ event, resolve }) => {
	// Fetch current session from Better Auth
	const session = await auth.api.getSession({
		headers: event.request.headers
	});

	// Make session and user available on server
	event.locals.session = session?.session ?? null;
	event.locals.user = session?.user ?? null;

	const { pathname } = event.url;

	// Better Auth owns /api/auth/* — it has to stay reachable for the sign-in and
	// registration ceremonies themselves.
	if (!pathname.startsWith('/api/auth')) {
		const user = event.locals.user;

		if (!user) {
			if (!isPublic(pathname)) redirect(302, '/login');
		} else if (user.status !== 'approved') {
			// Rejected and still-pending users get the holding page and nothing else.
			if (pathname !== '/pending') redirect(302, '/pending');
		} else {
			// Signed in and approved — no reason to sit on the signed-out pages.
			// /login matches by prefix so the code page is covered too. /link is
			// left reachable: a signed-in browser can still fetch a code for itself.
			if (
				pathname === '/login' ||
				pathname.startsWith('/login/') ||
				pathname === '/register' ||
				pathname === '/pending'
			) {
				redirect(302, '/');
			}
			if (pathname.startsWith('/admin') && user.role !== 'admin') {
				redirect(302, '/');
			}
		}
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

/**
 * Without this, SvelteKit turns every server-side throw into a bare 500 and the
 * cause never reaches the logs.
 */
export const handleError: HandleServerError = ({ error, event, status, message }) => {
	// 404s come through here too and carry nothing worth dumping.
	if (status === 404) return { message };

	const id = crypto.randomUUID();
	console.error(`[error ${id}] ${status} ${event.request.method} ${event.url.pathname}`);

	if (error instanceof Error) {
		console.error(`[error ${id}] ${error.name}: ${error.message}`);
		if (error.stack) console.error(`[error ${id}] ${error.stack}`);
		if (error.cause) console.error(`[error ${id}] caused by`, error.cause);
	} else {
		console.error(`[error ${id}] thrown`, error);
	}

	if (error && typeof error === 'object') {
		// The parts worth reading hang off non-standard properties that a plain
		// stack dump leaves out: pg's code/detail, better-auth's schema findings.
		const { code, detail, hint, routine, severity, findings } = error as Record<string, unknown>;

		if (code ?? detail ?? hint ?? routine) {
			console.error(`[error ${id}] cause`, { code, severity, detail, hint, routine });
		}
		// better-auth lists exactly which tables or columns it could not find.
		if (Array.isArray(findings)) {
			console.error(`[error ${id}] schema findings`, JSON.stringify(findings, null, 2));
		}
		if (typeof code === 'string' && CAUSE_HINTS[code]) {
			console.error(`[error ${id}] likely: ${CAUSE_HINTS[code]}`);
		}
	}

	return { message, id };
};
