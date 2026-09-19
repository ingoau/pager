import type { PageServerLoad } from './$types';
import { countUsers } from '$lib/server/store';

export const load: PageServerLoad = async () => {
	// The very first registration claims the instance as admin, so say so
	// plainly rather than letting it happen silently.
	return { firstUser: (await countUsers()) === 0 };
};
