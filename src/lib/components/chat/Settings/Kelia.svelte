<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { getLanguages, changeLanguage } from '$lib/i18n';
	import { settings, theme } from '$lib/stores';
	import { setTextScale } from '$lib/utils/text-scale';

	const i18n = getContext('i18n');

	export let saveSettings: Function;

	let themes = ['dark', 'light', 'oled-dark'];
	let selectedTheme = 'system';
	let languages: Awaited<ReturnType<typeof getLanguages>> = [];
	let lang = '';
	let textScale = null;

	const applyTheme = (_theme: string) => {
		let themeToApply = _theme === 'oled-dark' ? 'dark' : _theme === 'her' ? 'light' : _theme;

		if (_theme === 'system') {
			themeToApply = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
		}

		if (themeToApply === 'dark' && !_theme.includes('oled')) {
			document.documentElement.style.setProperty('--color-gray-800', '#333');
			document.documentElement.style.setProperty('--color-gray-850', '#262626');
			document.documentElement.style.setProperty('--color-gray-900', '#171717');
			document.documentElement.style.setProperty('--color-gray-950', '#0d0d0d');
		}

		themes
			.filter((e) => e !== themeToApply)
			.forEach((e) => {
				e.split(' ').forEach((token) => {
					document.documentElement.classList.remove(token);
				});
			});

		themeToApply.split(' ').forEach((token) => {
			document.documentElement.classList.add(token);
		});

		const metaThemeColor = document.querySelector('meta[name="theme-color"]');
		if (metaThemeColor) {
			if (_theme.includes('system')) {
				const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
					? 'dark'
					: 'light';
				metaThemeColor.setAttribute('content', systemTheme === 'light' ? '#ffffff' : '#171717');
			} else {
				metaThemeColor.setAttribute(
					'content',
					_theme === 'dark'
						? '#171717'
						: _theme === 'oled-dark'
							? '#000000'
							: _theme === 'her'
								? '#983724'
								: '#ffffff'
				);
			}
		}

		if (_theme.includes('oled')) {
			document.documentElement.style.setProperty('--color-gray-800', '#101010');
			document.documentElement.style.setProperty('--color-gray-850', '#050505');
			document.documentElement.style.setProperty('--color-gray-900', '#000000');
			document.documentElement.style.setProperty('--color-gray-950', '#000000');
			document.documentElement.classList.add('dark');
		}

		if (typeof window !== 'undefined' && window.applyTheme) {
			window.applyTheme();
		}
	};

	const themeChangeHandler = (_theme: string) => {
		theme.set(_theme);
		localStorage.setItem('theme', _theme);
		applyTheme(_theme);
	};

	const setTextScaleHandler = (scale) => {
		textScale = scale;
		setTextScale(textScale);

		if (textScale === 1) {
			textScale = null;
		}
		saveSettings({ textScale });
	};

	onMount(async () => {
		selectedTheme = localStorage.theme ?? 'system';
		languages = await getLanguages();
		lang = $i18n.language;
		textScale = $settings?.textScale ?? null;
	});
</script>

<div class="flex flex-col h-full justify-between text-sm" id="tab-kelia">
	<div class="overflow-y-scroll max-h-[28rem] md:max-h-full">
		<div class="mb-1 text-sm font-medium">Ontos.Live UI</div>

		<div class="flex w-full justify-between">
			<div class="self-center text-xs font-medium">{$i18n.t('Theme')}</div>
			<div class="flex items-center relative">
				<select
					class="dark:bg-gray-900 w-fit pr-8 rounded-sm py-2 px-2 text-xs bg-transparent text-right {$settings.highContrastMode
						? ''
						: 'outline-hidden'}"
					bind:value={selectedTheme}
					on:change={() => themeChangeHandler(selectedTheme)}
				>
					<option value="system">⚙️ {$i18n.t('System')}</option>
					<option value="dark">🌑 {$i18n.t('Dark')}</option>
					<option value="oled-dark">🌃 {$i18n.t('OLED Dark')}</option>
					<option value="light">☀️ {$i18n.t('Light')}</option>
					<option value="her">🌷 Her</option>
				</select>
			</div>
		</div>

		<div class="flex w-full justify-between">
			<div class="self-center text-xs font-medium">{$i18n.t('Language')}</div>
			<div class="flex items-center relative">
				<select
					class="dark:bg-gray-900 w-fit pr-8 rounded-sm py-2 px-2 text-xs bg-transparent text-right {$settings.highContrastMode
						? ''
						: 'outline-hidden'}"
					bind:value={lang}
					on:change={() => {
						changeLanguage(lang);
					}}
				>
					{#each languages as language}
						<option value={language['code']}>{language['title']}</option>
					{/each}
				</select>
			</div>
		</div>

		<div>
			<div class="py-0.5 flex w-full justify-between">
				<label id="ui-scale-label" class="self-center text-xs font-medium" for="ui-scale-slider">
					{$i18n.t('UI Scale')}
				</label>

				<div class="flex items-center gap-2 p-1">
					<button
						class="text-xs"
						aria-live="polite"
						type="button"
						on:click={() => {
							if (textScale === null) {
								textScale = 1;
							} else {
								textScale = null;
								setTextScaleHandler(1);
							}
						}}
					>
						{#if textScale === null}
							<span>{$i18n.t('Default')}</span>
						{:else}
							<span>{textScale}x</span>
						{/if}
					</button>
				</div>
			</div>

			{#if textScale !== null}
				<div class="flex items-center gap-2 px-1 pb-1">
					<input
						id="ui-scale-slider"
						class="w-full"
						type="range"
						min="1"
						max="1.5"
						step={0.01}
						bind:value={textScale}
						on:change={() => {
							setTextScaleHandler(textScale);
						}}
						aria-labelledby="ui-scale-label"
					/>
				</div>
			{/if}
		</div>
	</div>
</div>
