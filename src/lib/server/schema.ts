import type { BetterAuthPlugin } from 'better-auth';

/**
 * A minimal plugin that exists only to register the `pageLog` model, so it is
 * picked up by better-auth's schema generation and reachable through the same
 * adapter as the auth tables.
 */
export const pagerSchema = () =>
	({
		id: 'pager',
		schema: {
			pageLog: {
				fields: {
					// Intentionally not a foreign key: the log is the record of who
					// paged you, so it has to outlive the user being deleted. Name and
					// email are denormalised for the same reason.
					userId: { type: 'string', required: true },
					userName: { type: 'string', required: true },
					userEmail: { type: 'string', required: true },
					title: { type: 'string', required: true },
					details: { type: 'string', required: false },
					urgency: { type: 'string', required: true },
					/** 'sent' or 'failed'. */
					status: { type: 'string', required: true },
					/** PagerDuty incident id, when the API accepted it. */
					incidentId: { type: 'string', required: false },
					/** Failure reason, when it did not. */
					error: { type: 'string', required: false },
					createdAt: { type: 'date', required: true }
				}
			}
		}
	}) satisfies BetterAuthPlugin;

export type PageLog = {
	id: string;
	userId: string;
	userName: string;
	userEmail: string;
	title: string;
	details?: string | null;
	urgency: string;
	status: string;
	incidentId?: string | null;
	error?: string | null;
	createdAt: Date;
};
