<script lang="ts">
	import { PROJECT } from '$lib/config/branding';
</script>

<div
	class="inline-flex items-center gap-1 rounded-full border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 px-2 py-0.5 text-[11px] leading-none text-gray-700 dark:text-gray-200"
>
	<img src={PROJECT.badgeImagePath} alt={PROJECT.name} class="size-3.5 rounded-full object-cover" />
	<span class="font-medium lowercase">{PROJECT.name}</span>
</div>
