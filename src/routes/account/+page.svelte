<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Spinner from '$lib/components/ui/spinner/spinner.svelte';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { authClient } from '$lib/auth-client';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import {
		DeviceMobileIcon,
		FingerprintSimpleIcon,
		PlusIcon,
		TrashIcon,
		WarningIcon
	} from 'phosphor-svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import SessionList from '$lib/components/session-list.svelte';

	const { data, form } = $props();

	let adding = $state(false);
	let newPasskeyName = $state('');

	let deviceCode = $state('');
	let approving = $state(false);
	let confirmLink = $state(false);

	/**
	 * Approving hands full access to this account to whichever device holds that
	 * code, so make the user say so explicitly. A code someone else read out to
	 * you is an attack, not a favour.
	 */
	function askToApprove(event: SubmitEvent) {
		event.preventDefault();
		if (deviceCode.trim()) confirmLink = true;
	}

	async function approveDevice() {
		approving = true;
		const { error } = await authClient.device.approve({ userCode: deviceCode.trim() });
		approving = false;
		confirmLink = false;

		if (error) {
			toast.error(error.error_description || 'Could not approve that code');
			return;
		}

		deviceCode = '';
		toast.success('Device approved');
		await invalidateAll();
	}

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
				high priority: {data.allowHigh ? 'allowed' : 'not allowed'}
			</p>
		</div>

		<Separator />

		<div class="space-y-2">
			<h2 class="font-medium">passkeys</h2>
			<p class="text-xs text-muted-foreground">
				add additional passkeys so you don't get locked out
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
					placeholder="name (optional)"
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

		<Separator />

		<div class="space-y-2">
			<h2 class="font-medium">link a device</h2>
			<p class="text-xs text-muted-foreground">
				enter the code shown on the other device to sign it in as you
			</p>
			<form class="flex items-center gap-2" onsubmit={askToApprove}>
				<DeviceMobileIcon class="size-4 shrink-0" />
				<Input
					bind:value={deviceCode}
					placeholder="XXXXXXXX"
					maxlength={20}
					class="h-8 font-mono tracking-widest"
					required
				/>
				<Button type="submit" size="sm" disabled={approving}>
					{#if approving}
						<Spinner />
					{/if}
					approve
				</Button>
			</form>
		</div>

		<Separator />

		<div class="space-y-2">
			<h2 class="font-medium">sessions</h2>
			<p class="text-xs text-muted-foreground">revoke anything you don't recognise</p>
			<SessionList sessions={data.sessions} action="?/revokeSession" />
		</div>
	</div>
</div>

<AlertDialog.Root bind:open={confirmLink}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<WarningIcon class="size-8" />
			<AlertDialog.Title>sign in another device?</AlertDialog.Title>
			<AlertDialog.Description>
				this gives whichever device is showing <span class="font-mono">{deviceCode.trim()}</span>
				full access to your account.
				<br />
				<br />
				only continue if you are holding that device. if someone sent you this code, they are trying to
				get in as you.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel disabled={approving}>cancel</AlertDialog.Cancel>
			<AlertDialog.Action onclick={approveDevice} disabled={approving}>
				{#if approving}
					<Spinner />
				{/if}
				approve
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
