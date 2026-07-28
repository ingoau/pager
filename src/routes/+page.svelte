<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { CheckIcon, WarningIcon, XIcon } from 'phosphor-svelte';
	import { applyAction, enhance } from '$app/forms';
	import Spinner from '$lib/components/ui/spinner/spinner.svelte';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Label } from '$lib/components/ui/label/index.js';

	let formElement = $state<HTMLFormElement | null>(null);

	let confirmDialogOpen = $state(false);
	let confirmed = $state(false);
	let loading = $state(false);

	const { form } = $props();

	function handleSubmit(event: SubmitEvent) {
		if (!confirmed) {
			event.preventDefault();
			confirmDialogOpen = true;
		}
	}

	function confirmSubmit() {
		confirmed = true;
		formElement?.requestSubmit();
		confirmed = false;
	}
</script>

<div class="w-full p-4">
	<div class="mx-auto w-full max-w-xl border bg-card p-4">
		{#if form}
			{#if form.success}
				<div class="flex flex-row items-center gap-2">
					<CheckIcon class="size-6" />
					<p>submitted</p>
				</div>
			{:else if !form.success}
				<div class="flex flex-row items-center gap-2">
					<XIcon class="size-6" />
					<p>something went wrong</p>
				</div>
			{/if}
		{:else}
			<form
				class="space-y-4"
				bind:this={formElement}
				onsubmit={handleSubmit}
				method="POST"
				use:enhance={({ cancel }) => {
					if (confirmed) {
						loading = true;
					} else {
						cancel();
						confirmDialogOpen = true;
					}
					return async ({ result }) => {
						await applyAction(result);
						confirmDialogOpen = false;
						loading = false;
					};
				}}
			>
				<h1 class="text-lg font-semibold">pager</h1>
				<Input required placeholder="short description*" name="description" autofocus />
				<Textarea placeholder="more details" name="details"></Textarea>
				<RadioGroup.Root required value="low" name="priority">
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
		{/if}
	</div>
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
			<AlertDialog.Cancel disabled={loading}>cancel</AlertDialog.Cancel>
			<AlertDialog.Action onclick={confirmSubmit} disabled={loading}>
				{#if loading}
					<Spinner />
				{:else}
					<CheckIcon />
				{/if}
				continue
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
