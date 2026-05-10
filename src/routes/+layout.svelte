<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '$lib/components/ui/sonner/index.js';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<ModeWatcher />
<Toaster
	toastOptions={{
		style: 'border-radius: 0;'
	}}
/>
{@render children()}

<footer class="px-4 text-center text-xs text-muted-foreground">
	<a href="https://gitlab.com/ingowolf/pager" target="_blank" class="hover:underline">source code</a
	>
</footer>
