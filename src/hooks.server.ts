import { auth } from '$lib/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import { redirect, type Handle } from '@sveltejs/kit';

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
