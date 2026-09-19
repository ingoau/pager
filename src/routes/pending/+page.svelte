<script lang="ts">
	import SignOutButton from '$lib/components/sign-out-button.svelte';
	import { HourglassIcon, ProhibitIcon } from 'phosphor-svelte';

	const { data } = $props();
</script>

<div class="w-full p-4">
	<div
		class="mx-auto flex w-full max-w-xl flex-col items-center gap-2 border bg-card p-4 text-center"
	>
		{#if data.status === 'rejected'}
			<ProhibitIcon class="size-10" />
			<h1 class="text-lg font-semibold">access denied</h1>
			<p class="text-sm text-muted-foreground">request rejected</p>
		{:else}
			<HourglassIcon class="size-10" />
			<h1 class="text-lg font-semibold">waiting for approval</h1>
			<p class="text-sm text-muted-foreground">passkey registered</p>
		{/if}
		<SignOutButton variant="outline" />
	</div>
</div>
