<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import Button from '$lib/components/ui/button/button.svelte';
	import Spinner from '$lib/components/ui/spinner/spinner.svelte';
	import { DeviceMobileIcon } from 'phosphor-svelte';
	import { onDestroy } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';

	const CLIENT_ID = 'pager-web';

	let userCode = $state<string | null>(null);
	let requesting = $state(false);
	let waiting = $state(false);
	let timer: ReturnType<typeof setTimeout> | null = null;

	onDestroy(() => {
		if (timer) clearTimeout(timer);
	});

	async function start() {
		requesting = true;
		const { data, error } = await authClient.device.code({
			client_id: CLIENT_ID,
			scope: 'openid'
		});
		requesting = false;

		if (error || !data) {
			toast.error(error?.error_description || 'Could not start device linking.');
			return;
		}

		userCode = data.user_code;
		waiting = true;
		poll(data.device_code, (data.interval ?? 3) * 1000);
	}

	/**
	 * RFC 8628 polling: keep asking until the other device approves. Anything
	 * other than "still waiting" or "back off" ends the flow.
	 */
	function poll(deviceCode: string, interval: number) {
		timer = setTimeout(async () => {
			const { data, error } = await authClient.device.token({
				grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
				device_code: deviceCode,
				client_id: CLIENT_ID
			});

			if (data) {
				waiting = false;
				await invalidateAll();
				await goto(resolve('/'));
				return;
			}

			const code = error?.error;
			if (code === 'authorization_pending') return poll(deviceCode, interval);
			if (code === 'slow_down') return poll(deviceCode, interval + 2000);

			waiting = false;
			userCode = null;
			toast.error(
				code === 'expired_token'
					? 'That code expired. Try again.'
					: code === 'access_denied'
						? 'The request was denied.'
						: error?.error_description || 'Device linking failed.'
			);
		}, interval);
	}
</script>

<div class="w-full p-4">
	<div class="mx-auto flex w-full max-w-xl flex-col items-center gap-3 border bg-card p-4">
		<DeviceMobileIcon class="size-10" />
		{#if userCode}
			<p class="text-sm text-muted-foreground">enter this on a device you're signed in on</p>
			<p class="font-mono text-3xl tracking-widest select-all">{userCode}</p>
			{#if waiting}
				<p class="flex items-center gap-2 text-xs text-muted-foreground">
					<Spinner /> waiting for approval
				</p>
			{/if}
		{:else}
			<h1 class="font-semibold">sign in from another device</h1>
			<p class="text-center text-sm text-muted-foreground">
				get a code here, then approve it from a device you're already signed in on
			</p>
			<Button onclick={start} disabled={requesting}>
				{#if requesting}
					<Spinner />
				{/if}
				get a code
			</Button>
		{/if}
		<p class="mt-2 text-xs text-muted-foreground">
			<a href={resolve('/login')} class="underline">back to sign in</a>
		</p>
	</div>
</div>
