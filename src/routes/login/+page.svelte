<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import Button from '$lib/components/ui/button/button.svelte';
	import { FingerprintSimpleIcon } from 'phosphor-svelte';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	let authenticating = $state(false);

	async function authenticate() {
		authenticating = true;
		const { error } = await authClient.signIn.passkey();
		if (error) {
			toast.error(error.message || 'Something went wrong');
		}
		authenticating = false;
	}

	onMount(() => {
		authenticate();
	});
</script>

<div class="w-full p-4">
	<div class="mx-auto flex w-full max-w-xl flex-col items-center gap-2 border bg-card p-4">
		<FingerprintSimpleIcon class="size-10" />
		authenticate to access
		<Button disabled={authenticating} onclick={authenticate}>passkey</Button>
	</div>
</div>
