import type { Actions } from './$types';
import { PAGERDUTY_KEY, PAGERDUTY_SERVICE } from '$env/static/private';

export const actions = {
	default: async (event) => {
		console.log(event);

		const url = 'https://api.pagerduty.com/incidents';
		const options = {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				From: '',
				Authorization: 'Token token=' + PAGERDUTY_KEY
			},
			body: JSON.stringify({
				incident: {
					type: 'incident',
					title: 'The server is on fire.',
					service: { id: PAGERDUTY_SERVICE, type: 'service_reference' },
					urgency: 'high',
					body: {
						type: 'incident_body',
						details: 'Cheese'
					}
				}
			})
		};

		try {
			const response = await fetch(url, options);
			const data = await response.json();
			console.log(data);
		} catch (error) {
			console.error(error);
			return {
				success: false
			};
		}

		return {
			success: true
		};
	}
} satisfies Actions;
