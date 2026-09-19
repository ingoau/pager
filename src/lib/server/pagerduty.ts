import { PAGERDUTY_FROM, PAGERDUTY_KEY, PAGERDUTY_SERVICE } from '$env/static/private';

export type Urgency = 'low' | 'high';

export function isUrgency(value: unknown): value is Urgency {
	return value === 'low' || value === 'high';
}

export type TriggerResult = { ok: true; incidentId: string } | { ok: false; error: string };

/**
 * Create a PagerDuty incident.
 *
 * The `From` header must be the login email of a real user in the PagerDuty
 * account — the REST API rejects the request outright without it.
 */
export async function triggerIncident(input: {
	title: string;
	details: string;
	urgency: Urgency;
}): Promise<TriggerResult> {
	let response: Response;
	try {
		response = await fetch('https://api.pagerduty.com/incidents', {
			method: 'POST',
			headers: {
				Accept: 'application/vnd.pagerduty+json;version=2',
				'Content-Type': 'application/json',
				From: PAGERDUTY_FROM,
				Authorization: `Token token=${PAGERDUTY_KEY}`
			},
			body: JSON.stringify({
				incident: {
					type: 'incident',
					// PagerDuty caps incident titles at 1024 characters.
					title: input.title.slice(0, 1024),
					service: { id: PAGERDUTY_SERVICE, type: 'service_reference' },
					urgency: input.urgency,
					body: {
						type: 'incident_body',
						details: input.details
					}
				}
			})
		});
	} catch (error) {
		console.error('[pagerduty] request failed', error);
		return { ok: false, error: 'Could not reach PagerDuty.' };
	}

	const payload = await response.json().catch(() => null);

	if (!response.ok) {
		// PagerDuty reports failures as { error: { message, errors: [...] } }.
		const detail = payload?.error?.errors?.join(', ') || payload?.error?.message;
		console.error('[pagerduty] rejected', response.status, payload);
		return {
			ok: false,
			error: detail
				? `PagerDuty rejected the page (${response.status}): ${detail}`
				: `PagerDuty rejected the page (${response.status}).`
		};
	}

	const incidentId = payload?.incident?.id;
	if (typeof incidentId !== 'string') {
		console.error('[pagerduty] unexpected response shape', payload);
		return { ok: false, error: 'PagerDuty returned an unexpected response.' };
	}

	return { ok: true, incidentId };
}
