import type { Model } from '$lib/stores';

export type ChatResolverSource =
	| 'ui.default_workspace_preset_id'
	| 'ui.default_models'
	| 'settings.models'
	| 'first_visible'
	| 'selected_models'
	| 'no_visible_models';

export type ChatModelTrace = {
	selectedWorkspacePresetId: string | null;
	resolverSource: ChatResolverSource;
	configTrace: {
		'ui.default_workspace_preset_id': string[];
		'ui.default_models': string[];
		'settings.models': string[];
	};
};

const normalizeModelIds = (value: string | string[] | null | undefined): string[] => {
	if (!value) {
		return [];
	}

	const modelIds = Array.isArray(value) ? value : value.split(',');

	return [...new Set(modelIds.map((id) => id.trim()).filter(Boolean))];
};

export const getAvailableChatModelIds = (models: Model[] = []): string[] => {
	return models
		.filter((model) => !(model?.info?.meta?.hidden ?? false))
		.map((model) => model.id);
};

export const sanitizeSelectedChatModels = (
	selectedModels: string[] = [],
	models: Model[] = []
): string[] => {
	const availableModelIds = new Set(getAvailableChatModelIds(models));

	return normalizeModelIds(selectedModels).filter((modelId) => availableModelIds.has(modelId));
};

export const resolveDefaultChatModels = ({
	models = [],
	defaultWorkspacePresetId,
	instanceDefaultModels,
	workspaceDefaultModels
}: {
	models?: Model[];
	defaultWorkspacePresetId?: string | null;
	instanceDefaultModels?: string | string[] | null;
	workspaceDefaultModels?: string[] | null;
}): string[] => {
	return resolveDefaultChatModelSelection({
		models,
		defaultWorkspacePresetId,
		instanceDefaultModels,
		workspaceDefaultModels
	}).modelIds;
};

export const resolveDefaultChatModelSelection = ({
	models = [],
	defaultWorkspacePresetId,
	instanceDefaultModels,
	workspaceDefaultModels
}: {
	models?: Model[];
	defaultWorkspacePresetId?: string | null;
	instanceDefaultModels?: string | string[] | null;
	workspaceDefaultModels?: string[] | null;
}): {
	modelIds: string[];
	trace: ChatModelTrace;
} => {
	const availableModelIds = getAvailableChatModelIds(models);
	const configTrace = {
		'ui.default_workspace_preset_id': normalizeModelIds(defaultWorkspacePresetId),
		'ui.default_models': normalizeModelIds(instanceDefaultModels),
		'settings.models': normalizeModelIds(workspaceDefaultModels)
	};

	if (availableModelIds.length === 0) {
		return {
			modelIds: [],
			trace: {
				selectedWorkspacePresetId: null,
				resolverSource: 'no_visible_models',
				configTrace
			}
		};
	}

	for (const [source, candidate] of [
		['ui.default_workspace_preset_id', defaultWorkspacePresetId],
		['ui.default_models', instanceDefaultModels],
		['settings.models', workspaceDefaultModels]
	] as const) {
		const resolved = normalizeModelIds(candidate).filter((modelId) =>
			availableModelIds.includes(modelId)
		);

		if (resolved.length > 0) {
			return {
				modelIds: resolved,
				trace: {
					selectedWorkspacePresetId: resolved[0],
					resolverSource: source,
					configTrace
				}
			};
		}
	}

	return {
		modelIds: [availableModelIds[0]],
		trace: {
			selectedWorkspacePresetId: availableModelIds[0],
			resolverSource: 'first_visible',
			configTrace
		}
	};
};

export const hasSelectedChatModels = (selectedModels: string[] = []): boolean => {
	return normalizeModelIds(selectedModels).length > 0;
};

export const buildSelectedModelTrace = ({
	selectedModels = [],
	defaultWorkspacePresetId,
	instanceDefaultModels,
	workspaceDefaultModels
}: {
	selectedModels?: string[];
	defaultWorkspacePresetId?: string | null;
	instanceDefaultModels?: string | string[] | null;
	workspaceDefaultModels?: string[] | null;
}): ChatModelTrace => {
	const normalizedSelectedModels = normalizeModelIds(selectedModels);

	if (normalizedSelectedModels.length > 0) {
		return {
			selectedWorkspacePresetId: normalizedSelectedModels[0],
			resolverSource: 'selected_models',
			configTrace: {
				'ui.default_workspace_preset_id': normalizeModelIds(defaultWorkspacePresetId),
				'ui.default_models': normalizeModelIds(instanceDefaultModels),
				'settings.models': normalizeModelIds(workspaceDefaultModels)
			}
		};
	}

	return {
		selectedWorkspacePresetId: null,
		resolverSource: 'no_visible_models',
		configTrace: {
			'ui.default_workspace_preset_id': normalizeModelIds(defaultWorkspacePresetId),
			'ui.default_models': normalizeModelIds(instanceDefaultModels),
			'settings.models': normalizeModelIds(workspaceDefaultModels)
		}
	};
};

export const getChatInputPlaceholder = (
	configuredPlaceholder: string | null | undefined,
	fallbackPlaceholder: string
): string => {
	return configuredPlaceholder?.trim() || fallbackPlaceholder;
};

export const getNoModelsMessage = (
	configuredMessage: string | null | undefined,
	fallbackMessage: string
): string => {
	return configuredMessage?.trim() || fallbackMessage;
};

export const shouldShowSuggestedPrompts = ({
	showSuggestedPrompts,
	suggestionPrompts = []
}: {
	showSuggestedPrompts?: boolean | null;
	suggestionPrompts?: unknown[];
}): boolean => {
	return showSuggestedPrompts === true && suggestionPrompts.length > 0;
};

export const shouldShowWelcomePanel = (
	showWelcomePanel: boolean | null | undefined
): boolean => {
	return showWelcomePanel === true;
};
