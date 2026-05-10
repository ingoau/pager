import type { Actions } from './$types';
import { PAGERDUTY_KEY, PAGERDUTY_SERVICE } from '$env/static/private';

export const actions = {
	default: async (event) => {
		const formData = await event.request.formData();
		const description = formData.get('description')?.toString();
		const details = formData.get('details')?.toString();

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
					title: description ?? 'No description provided',
					service: { id: PAGERDUTY_SERVICE, type: 'service_reference' },
					body: {
						type: 'incident_body',
						details: details ?? 'No details provided'
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
