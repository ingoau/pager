<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Label } from '$lib/components/ui/label/index.js';

	let form: HTMLFormElement;

	let confirmed = $state(false);

	function handleSubmit(event: SubmitEvent) {
		if (!confirmed) {
			event.preventDefault();
		}
	}

	function confirmSubmit() {
		confirmed = true;
		form.requestSubmit();
	}
</script>

<div class="w-full p-4">
	<form
		class="mx-auto w-full max-w-xl space-y-4 border bg-card p-4"
		bind:this={form}
		onsubmit={handleSubmit}
	>
		<h1 class="text-lg font-semibold">pager</h1>
		<Input required placeholder="short description*" />
		<Textarea placeholder="more details"></Textarea>
		<RadioGroup.Root required value="low">
			<div class="flex items-center space-x-2">
				<RadioGroup.Item value="low" id="low" />
				<Label for="low">Low priority</Label>
			</div>
			<div class="flex items-center space-x-2">
				<RadioGroup.Item value="high" id="high" />
				<Label for="high">High priority</Label>
			</div>
		</RadioGroup.Root>
		<Button type="submit">Submit</Button>
	</form>
</div>
