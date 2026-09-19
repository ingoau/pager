<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import { enhance } from '$app/forms';
	import { DesktopIcon } from 'phosphor-svelte';

	type Entry = {
		id: string;
		token: string;
		createdAt: string | Date;
		expiresAt: string | Date;
		ipAddress?: string | null;
		userAgent?: string | null;
		/** Shown above the details when one list mixes several users. */
		label?: string | null;
		current: boolean;
	};

	const { sessions, action }: { sessions: Entry[]; action: string } = $props();

	const dateFormat = new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short'
	});

	/**
	 * Raw user agents are unreadable at a glance. Pull out the browser and OS
	 * when we recognise them and fall back to the whole string otherwise.
	 */
	function describe(userAgent?: string | null) {
		if (!userAgent) return 'unknown device';

		const browser = /Edg\//.test(userAgent)
			? 'Edge'
			: /OPR\//.test(userAgent)
				? 'Opera'
				: /Chrome\//.test(userAgent)
					? 'Chrome'
					: /Safari\//.test(userAgent)
						? 'Safari'
						: /Firefox\//.test(userAgent)
							? 'Firefox'
							: null;

		const os = /iPhone|iPad/.test(userAgent)
			? 'iOS'
			: /Android/.test(userAgent)
				? 'Android'
				: /Mac OS X/.test(userAgent)
					? 'macOS'
					: /Windows/.test(userAgent)
						? 'Windows'
						: /Linux/.test(userAgent)
							? 'Linux'
							: null;

		if (browser && os) return `${browser} on ${os}`;
		return browser ?? os ?? userAgent;
	}
</script>

<ul class="divide-y border">
	{#each sessions as session (session.id)}
		<li class="flex items-start gap-2 p-2 text-sm">
			<DesktopIcon class="mt-0.5 size-4 shrink-0" />
			<div class="min-w-0 flex-1 space-y-0.5">
				<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
					{#if session.label}
						<span class="font-medium">{session.label}</span>
					{/if}
					<span title={session.userAgent ?? ''}>{describe(session.userAgent)}</span>
					{#if session.current}
						<span class="border px-1.5 py-0.5 text-xs uppercase">this session</span>
					{/if}
				</div>
				<p class="text-xs text-muted-foreground">
					{session.ipAddress || 'no ip'} · {dateFormat.format(new Date(session.createdAt))} · expires
					{dateFormat.format(new Date(session.expiresAt))}
				</p>
			</div>
			<form method="POST" {action} class="shrink-0" use:enhance>
				<input type="hidden" name="token" value={session.token} />
				<Button type="submit" variant="outline" size="sm">
					{session.current ? 'sign out' : 'revoke'}
				</Button>
			</form>
		</li>
	{:else}
		<li class="p-2 text-sm text-muted-foreground">no active sessions</li>
	{/each}
</ul>
