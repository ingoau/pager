<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
</script>

<div class="w-full p-4">
	<div class="mx-auto w-full max-w-xl space-y-2 border bg-card p-4">
		<h1 class="text-lg font-semibold">pager</h1>
		<Input placeholder="short description*" />
		<Textarea placeholder="more details"></Textarea>
		<Button type="submit">Submit</Button>
	</div>
</div>
