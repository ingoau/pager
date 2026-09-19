<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { authClient } from '$lib/auth-client';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';

	let { children, data } = $props();

	async function signOut() {
		await authClient.signOut();
		await invalidateAll();
		await goto(resolve('/login'));
	}
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<ModeWatcher />
<Toaster
	toastOptions={{
		style: 'border-radius: 0;'
	}}
/>

{#if data.user}
	<header class="flex flex-wrap items-center gap-x-4 gap-y-1 border-b px-4 py-2 text-xs">
		<span class="text-muted-foreground">{data.user.email}</span>
		<nav class="ml-auto flex items-center gap-4">
			<a href={resolve('/')} class="hover:underline">page</a>
			<a href={resolve('/account')} class="hover:underline">account</a>
			{#if data.user.role === 'admin'}
				<a href={resolve('/admin')} class="hover:underline">admin</a>
			{/if}
			<button type="button" class="hover:underline" onclick={signOut}>sign out</button>
		</nav>
	</header>
{/if}

{@render children()}

<footer class="px-4 py-2 text-center text-xs text-muted-foreground">
	<a href="https://github.com/ingoau/pager" target="_blank" class="hover:underline">source code</a>
</footer>
