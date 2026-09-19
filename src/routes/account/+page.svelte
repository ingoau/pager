<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Spinner from '$lib/components/ui/spinner/spinner.svelte';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { authClient } from '$lib/auth-client';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { FingerprintSimpleIcon, PlusIcon, TrashIcon } from 'phosphor-svelte';

	const { data, form } = $props();

	let adding = $state(false);
	let newPasskeyName = $state('');

	async function addPasskey() {
		adding = true;
		// Signed in, so the plugin attaches this passkey to the current account
		// rather than going through the access-request path.
		const { error } = await authClient.passkey.addPasskey({
			name: newPasskeyName.trim() || undefined
		});
		adding = false;

		if (error) {
			toast.error(error.message || 'Could not add that passkey');
			return;
		}

		newPasskeyName = '';
		toast.success('Passkey added');
		await invalidateAll();
	}

	const dateFormat = new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short'
	});
</script>

<div class="w-full p-4">
	<div class="mx-auto w-full max-w-xl space-y-4 border bg-card p-4">
		<div>
			<h1 class="text-lg font-semibold">account</h1>
			<p class="text-sm text-muted-foreground">
				high priority pages: {data.allowHigh ? 'allowed' : 'not allowed'}
			</p>
		</div>

		<Separator />

		<div class="space-y-2">
			<h2 class="font-medium">passkeys</h2>
			<p class="text-xs text-muted-foreground">
				add one per device so you don't get locked out if you lose one.
			</p>

			{#if form?.error}
				<p class="border border-destructive p-2 text-sm">{form.error}</p>
			{/if}

			<ul class="divide-y border">
				{#each data.passkeys as passkey (passkey.id)}
					<li class="flex flex-wrap items-center gap-2 p-2">
						<FingerprintSimpleIcon class="size-4 shrink-0" />
						<form method="POST" action="?/rename" class="flex items-center gap-2" use:enhance>
							<input type="hidden" name="id" value={passkey.id} />
							<Input
								name="name"
								value={passkey.name ?? ''}
								placeholder="unnamed"
								maxlength={60}
								class="h-8 w-40"
							/>
							<Button type="submit" variant="outline" size="sm">save</Button>
						</form>
						<span class="text-xs text-muted-foreground">
							{passkey.deviceType} · added {dateFormat.format(new Date(passkey.createdAt))}
						</span>
						{#if data.passkeys.length > 1}
							<form method="POST" action="?/remove" class="ml-auto" use:enhance>
								<input type="hidden" name="id" value={passkey.id} />
								<Button type="submit" variant="ghost" size="sm" aria-label="remove passkey">
									<TrashIcon />
								</Button>
							</form>
						{/if}
					</li>
				{/each}
			</ul>

			<div class="flex items-center gap-2">
				<Input
					bind:value={newPasskeyName}
					placeholder="name for the new passkey (optional)"
					maxlength={60}
					class="h-8"
				/>
				<Button onclick={addPasskey} disabled={adding} size="sm">
					{#if adding}
						<Spinner />
					{:else}
						<PlusIcon />
					{/if}
					add
				</Button>
			</div>
		</div>
	</div>
</div>
