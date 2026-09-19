<script lang="ts">
	import { Checkbox as CheckboxPrimitive } from 'bits-ui';
	import CheckIcon from 'phosphor-svelte/lib/Check';
	import MinusIcon from 'phosphor-svelte/lib/Minus';
	import { cn } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		checked = $bindable(false),
		indeterminate = $bindable(false),
		class: className,
		...restProps
	}: CheckboxPrimitive.RootProps = $props();
</script>

<CheckboxPrimitive.Root
	bind:ref
	bind:checked
	bind:indeterminate
	data-slot="checkbox"
	class={cn(
		'peer relative flex size-4 shrink-0 items-center justify-center rounded-none border border-input transition-colors outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 dark:data-[state=checked]:bg-primary',
		className
	)}
	{...restProps}
>
	{#snippet children({ checked, indeterminate })}
		<div data-slot="checkbox-indicator" class="flex items-center justify-center text-current">
			{#if indeterminate}
				<MinusIcon class="size-3" weight="bold" />
			{:else}
				<CheckIcon class={cn('size-3', !checked && 'text-transparent')} weight="bold" />
			{/if}
		</div>
	{/snippet}
</CheckboxPrimitive.Root>
