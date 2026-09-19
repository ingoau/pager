<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { FingerprintSimpleIcon } from 'phosphor-svelte';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Spinner from '$lib/components/ui/spinner/spinner.svelte';

	let authenticating = $state(false);
	let mode = $state<'passkey' | 'code'>('passkey');
	let code = $state('');
	let redeeming = $state(false);

	async function authenticate() {
		authenticating = true;
		const { error } = await authClient.signIn.passkey();
		if (error) {
			toast.error(error.message || 'Something went wrong');
			authenticating = false;
			return;
		}
		// The layout guard decides where they actually land: the pager if
		// approved, the holding page if not.
		await invalidateAll();
		await goto(resolve('/'));
	}

	async function redeem(event: SubmitEvent) {
		event.preventDefault();
		redeeming = true;

		const response = await fetch('/api/auth/login-code/redeem', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ code })
		});
		redeeming = false;

		if (!response.ok) {
			const body = await response.json().catch(() => null);
			toast.error(body?.message || 'That code is not valid.');
			return;
		}

		await invalidateAll();
		await goto(resolve('/'));
	}

	onMount(() => {
		authenticate();
	});
</script>

<div class="w-full p-4">
	<div class="mx-auto flex w-full max-w-xl flex-col items-center gap-2 border bg-card p-4">
		{#if mode === 'passkey'}
			<FingerprintSimpleIcon class="size-10" />
			authenticate to access
			<Button disabled={authenticating} onclick={authenticate}>
				{#if authenticating}
					<Spinner />
				{/if}
				passkey
			</Button>
			<button type="button" class="mt-2 text-xs underline" onclick={() => (mode = 'code')}>
				use a login code
			</button>
		{:else}
			<form class="flex w-full max-w-xs flex-col items-center gap-2" onsubmit={redeem}>
				<h1 class="font-semibold">login code</h1>
				<Input
					bind:value={code}
					placeholder="XXXX-XXXX-XXXX"
					autocomplete="one-time-code"
					class="text-center font-mono tracking-widest"
					required
				/>
				<Button type="submit" disabled={redeeming}>
					{#if redeeming}
						<Spinner />
					{/if}
					sign in
				</Button>
				<button type="button" class="mt-2 text-xs underline" onclick={() => (mode = 'passkey')}>
					use a passkey
				</button>
			</form>
		{/if}

		<p class="mt-2 text-xs text-muted-foreground">
			<a href={resolve('/link')} class="underline">sign in from another device</a>
			· <a href={resolve('/register')} class="underline">request access</a>
		</p>
	</div>
</div>
