<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { enhance } from '$app/forms';
	import { CheckIcon, ProhibitIcon, TrashIcon, XIcon } from 'phosphor-svelte';
	import SessionList from '$lib/components/session-list.svelte';

	const { data, form } = $props();

	let tab = $state<'users' | 'log'>('users');

	const dateFormat = new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short'
	});

	const pendingCount = $derived(data.users.filter((user) => user.status === 'pending').length);
</script>

<div class="w-full p-4">
	<div class="mx-auto w-full max-w-4xl space-y-4 border bg-card p-4">
		<div class="flex flex-wrap items-center gap-4">
			<h1 class="text-lg font-semibold">admin</h1>
			<nav class="flex gap-3 text-sm">
				<button
					type="button"
					class={tab === 'users' ? 'underline' : 'text-muted-foreground hover:underline'}
					onclick={() => (tab = 'users')}
				>
					users{pendingCount > 0 ? ` (${pendingCount} pending)` : ''}
				</button>
				<button
					type="button"
					class={tab === 'log' ? 'underline' : 'text-muted-foreground hover:underline'}
					onclick={() => (tab = 'log')}
				>
					log
				</button>
			</nav>
		</div>

		{#if form?.error}
			<p class="border border-destructive p-2 text-sm">{form.error}</p>
		{:else if form?.success}
			<p class="border p-2 text-sm">{form.success}</p>
		{/if}

		<Separator />

		{#if tab === 'users'}
			<ul class="divide-y border">
				{#each data.users as user (user.id)}
					<li class="space-y-2 p-3">
						<div class="flex flex-wrap items-center gap-2">
							<span class="font-medium">{user.name}</span>
							<span class="text-sm text-muted-foreground">{user.email}</span>
							<span class="border px-1.5 py-0.5 text-xs uppercase">{user.status}</span>
							{#if user.role === 'admin'}
								<span class="border px-1.5 py-0.5 text-xs uppercase">admin</span>
							{/if}
							{#if user.allowHigh}
								<span class="border px-1.5 py-0.5 text-xs uppercase">high priority</span>
							{/if}
							{#if user.sessions.length > 0}
								<span class="border px-1.5 py-0.5 text-xs uppercase">
									{user.sessions.length} session{user.sessions.length === 1 ? '' : 's'}
								</span>
							{/if}
							<span class="ml-auto text-xs text-muted-foreground">
								{dateFormat.format(new Date(user.createdAt))}
							</span>
						</div>

						{#if user.reason}
							<p class="text-sm text-muted-foreground">“{user.reason}”</p>
						{/if}

						{#if user.id === data.user?.id}
							<p class="text-xs text-muted-foreground">that's you.</p>
						{:else}
							<div class="flex flex-wrap gap-2">
								{#if user.status !== 'approved'}
									<form method="POST" action="?/approve" use:enhance>
										<input type="hidden" name="id" value={user.id} />
										<Button type="submit" size="sm"><CheckIcon /> approve</Button>
									</form>
								{/if}
								{#if user.status !== 'rejected'}
									<form method="POST" action="?/reject" use:enhance>
										<input type="hidden" name="id" value={user.id} />
										<Button type="submit" size="sm" variant="outline">
											<ProhibitIcon />
											{user.status === 'approved' ? 'revoke' : 'reject'}
										</Button>
									</form>
								{/if}
								<form method="POST" action="?/setHigh" use:enhance>
									<input type="hidden" name="id" value={user.id} />
									<input type="hidden" name="allowHigh" value={user.allowHigh ? 'false' : 'true'} />
									<Button type="submit" size="sm" variant="outline">
										{user.allowHigh ? 'disallow' : 'allow'} high priority
									</Button>
								</form>
								<form method="POST" action="?/remove" class="ml-auto" use:enhance>
									<input type="hidden" name="id" value={user.id} />
									<Button type="submit" size="sm" variant="ghost" aria-label="delete user">
										<TrashIcon />
									</Button>
								</form>
							</div>
						{/if}

						{#if user.sessions.length > 0}
							<SessionList sessions={user.sessions} action="?/revokeSession" />
						{/if}
					</li>
				{:else}
					<li class="p-3 text-sm text-muted-foreground">no users yet.</li>
				{/each}
			</ul>
		{:else}
			<ul class="divide-y border">
				{#each data.log as entry (entry.id)}
					<li class="space-y-1 p-3">
						<div class="flex flex-wrap items-center gap-2">
							{#if entry.status === 'sent'}
								<CheckIcon class="size-4 shrink-0" />
							{:else}
								<XIcon class="size-4 shrink-0" />
							{/if}
							<span class="font-medium">{entry.title}</span>
							<span class="border px-1.5 py-0.5 text-xs uppercase">{entry.urgency}</span>
							<span class="ml-auto text-xs text-muted-foreground">
								{dateFormat.format(new Date(entry.createdAt))}
							</span>
						</div>
						<p class="text-xs text-muted-foreground">
							{entry.userName} &lt;{entry.userEmail}&gt;
						</p>
						{#if entry.details}
							<p class="text-sm text-muted-foreground">{entry.details}</p>
						{/if}
						{#if entry.error}
							<p class="text-sm text-destructive">{entry.error}</p>
						{/if}
					</li>
				{:else}
					<li class="p-3 text-sm text-muted-foreground">nothing sent yet.</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
