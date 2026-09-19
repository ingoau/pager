<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import Button from '$lib/components/ui/button/button.svelte';
	import Spinner from '$lib/components/ui/spinner/spinner.svelte';
	import { SignOutIcon } from 'phosphor-svelte';
	import { authClient } from '$lib/auth-client';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';

	const { variant = 'link' }: { variant?: 'link' | 'outline' } = $props();

	let open = $state(false);
	let signingOut = $state(false);

	async function signOut() {
		signingOut = true;
		await authClient.signOut();
		await invalidateAll();
		await goto(resolve('/login'));
		signingOut = false;
		open = false;
	}
</script>

{#if variant === 'outline'}
	<Button variant="outline" onclick={() => (open = true)}>sign out</Button>
{:else}
	<button type="button" class="hover:underline" onclick={() => (open = true)}>sign out</button>
{/if}

<AlertDialog.Root bind:open>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<SignOutIcon class="size-8" />
			<AlertDialog.Title>sign out?</AlertDialog.Title>
			<AlertDialog.Description>
				you'll need your passkey, a login code, or another signed-in device to get back in.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel disabled={signingOut}>cancel</AlertDialog.Cancel>
			<AlertDialog.Action onclick={signOut} disabled={signingOut}>
				{#if signingOut}
					<Spinner />
				{/if}
				sign out
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
