<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { WarningIcon } from 'phosphor-svelte';

	let form: HTMLFormElement;

	let confirmDialogOpen = $state(true);
	let confirmed = $state(false);

	function handleSubmit(event: SubmitEvent) {
		if (!confirmed) {
			event.preventDefault();
			confirmDialogOpen = true;
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

<AlertDialog.Root bind:open={confirmDialogOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<WarningIcon class="size-8" />
			<AlertDialog.Title>are you sure?</AlertDialog.Title>
			<AlertDialog.Description>
				is this actually something important? do i really need to be notified about this now? could
				you just dm me?
				<br />
				<br />
				(any misuse may result in you being banned from this service)
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>cancel</AlertDialog.Cancel>
			<AlertDialog.Action>continue</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
