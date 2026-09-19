<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { Label } from '$lib/components/ui/label/index.js';
	import Spinner from '$lib/components/ui/spinner/spinner.svelte';
	import { CrownSimpleIcon } from 'phosphor-svelte';
	import { toast } from 'svelte-sonner';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';

	const { data } = $props();

	let name = $state('');
	let email = $state('');
	let reason = $state('');
	let submitting = $state(false);

	async function register(event: SubmitEvent) {
		event.preventDefault();
		submitting = true;

		// The passkey plugin forwards `context` to the server, which validates it
		// and creates the account only once the authenticator has responded.
		const { error } = await authClient.passkey.addPasskey({
			context: JSON.stringify({ name, email, reason })
		});

		if (error) {
			toast.error(error.message || 'Could not register that passkey');
			submitting = false;
			return;
		}

		// Registration does not sign you in, so do it now — the guard then routes
		// to the pager or the holding page depending on approval.
		const signIn = await authClient.signIn.passkey();
		if (signIn.error) {
			toast.success('Passkey registered. Sign in to continue.');
			await goto(resolve('/login'));
			return;
		}

		await invalidateAll();
		await goto(resolve('/'));
	}
</script>

<div class="w-full p-4">
	<div class="mx-auto w-full max-w-xl border bg-card p-4">
		<form class="space-y-4" onsubmit={register}>
			<h1 class="text-lg font-semibold">request access</h1>

			{#if data.firstUser}
				<div class="flex flex-row items-start gap-2 border p-2 text-sm">
					<CrownSimpleIcon class="mt-0.5 size-4 shrink-0" />
					<p>
						no accounts exist yet, so this first registration becomes the admin and is approved
						straight away.
					</p>
				</div>
			{:else}
				<p class="text-sm text-muted-foreground">
					register a passkey and your request goes to the admin. you can't page anyone until it's
					approved.
				</p>
			{/if}

			<div class="space-y-1">
				<Label for="name">name</Label>
				<Input id="name" required maxlength={80} bind:value={name} autocomplete="name" />
			</div>
			<div class="space-y-1">
				<Label for="email">email</Label>
				<Input
					id="email"
					type="email"
					required
					maxlength={200}
					bind:value={email}
					autocomplete="email"
				/>
			</div>
			<div class="space-y-1">
				<Label for="reason">why do you need to reach me?</Label>
				<Textarea id="reason" maxlength={500} bind:value={reason}></Textarea>
			</div>

			<Button type="submit" disabled={submitting}>
				{#if submitting}
					<Spinner />
				{/if}
				register passkey
			</Button>
			<p class="text-xs text-muted-foreground">
				already registered? <a href={resolve('/login')} class="underline">sign in</a>
			</p>
		</form>
	</div>
</div>
