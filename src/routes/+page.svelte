<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
</script>

<div class="w-full p-4">
	<div class="mx-auto w-full max-w-xl space-y-4 border bg-card p-4">
		<h1 class="text-lg font-semibold">pager</h1>
		<Input placeholder="short description*" />
		<Textarea placeholder="more details"></Textarea>
		<RadioGroup.Root value="low">
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
	</div>
</div>
