import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isUrgency, triggerIncident } from '$lib/server/pagerduty';
import { recordPage } from '$lib/server/store';

export const load: PageServerLoad = async ({ locals }) => {
	return {
		allowHigh: locals.user?.allowHigh ?? false
	};
};

export const actions = {
	default: async ({ request, locals }) => {
		const user = locals.user;
		// hooks.server.ts already guards this route; this is the backstop that
		// keeps the action itself from ever being the weak point.
		if (!user || user.status !== 'approved') {
			return fail(401, { error: 'Not allowed.' });
		}

		const formData = await request.formData();
		const title = formData.get('description')?.toString().trim() ?? '';
		const details = formData.get('details')?.toString().trim() ?? '';
		const requested = formData.get('priority')?.toString() ?? 'low';

		if (!title) {
			return fail(400, { error: 'A description is required.' });
		}

		if (!isUrgency(requested)) {
			return fail(400, { error: 'Invalid priority.' });
		}

		// Users without the high-priority permission are capped at low, whatever
		// the form said.
		const urgency = requested === 'high' && !user.allowHigh ? 'low' : requested;

		const result = await triggerIncident({
			title,
			details: details || 'No details provided',
			urgency
		});

		await recordPage({
			userId: user.id,
			userName: user.name,
			userEmail: user.email,
			title,
			details: details || null,
			urgency,
			status: result.ok ? 'sent' : 'failed',
			incidentId: result.ok ? result.incidentId : null,
			error: result.ok ? null : result.error
		});

		if (!result.ok) {
			return fail(502, { error: result.error });
		}

		return { success: true };
	}
} satisfies Actions;
