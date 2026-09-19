<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Spinner from '$lib/components/ui/spinner/spinner.svelte';
	import { KeyIcon } from 'phosphor-svelte';
	import { toast } from 'svelte-sonner';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';

	let code = $state('');
	let redeeming = $state(false);

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
</script>

<div class="w-full p-4">
	<div class="mx-auto flex w-full max-w-xl flex-col items-center gap-2 border bg-card p-4">
		<KeyIcon class="size-10" />
		<h1 class="font-semibold">login code</h1>
		<p class="text-center text-sm text-muted-foreground">ask the admin for a code</p>
		<form class="flex w-full max-w-xs flex-col items-center gap-2" onsubmit={redeem}>
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
		</form>
		<p class="mt-2 text-xs text-muted-foreground">
			<a href={resolve('/login')} class="underline">back to sign in</a>
		</p>
	</div>
</div>
