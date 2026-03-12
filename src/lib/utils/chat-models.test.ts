import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	buildSelectedModelTrace,
	getChatInputPlaceholder,
	getNoModelsMessage,
	resolveDefaultChatModelSelection,
	resolveDefaultChatModels,
	sanitizeSelectedChatModels,
	shouldShowSuggestedPrompts,
	shouldShowWelcomePanel
} from './chat-models.ts';

const models = [
	{
		id: 'alba',
		name: 'ALBA',
		owned_by: 'openai'
	},
	{
		id: 'instance-default',
		name: 'Instance Default',
		owned_by: 'openai'
	},
	{
		id: 'workspace-default',
		name: 'Workspace Default',
		owned_by: 'openai'
	},
	{
		id: 'fallback-public',
		name: 'Fallback Public',
		owned_by: 'openai'
	},
	{
		id: 'hidden-model',
		name: 'Hidden Model',
		owned_by: 'openai',
		info: {
			meta: {
				hidden: true
			}
		}
	}
];

describe('chat model resolution', () => {
	it('selects alba when it is visible', () => {
		assert.deepEqual(
			resolveDefaultChatModels({
				models,
				defaultWorkspacePresetId: 'alba',
				instanceDefaultModels: 'instance-default',
				workspaceDefaultModels: ['workspace-default']
			}),
			['alba']
		);
	});

	it('sets resolver_source to ui.default_workspace_preset_id when alba wins', () => {
		const resolved = resolveDefaultChatModelSelection({
			models,
			defaultWorkspacePresetId: 'alba',
			instanceDefaultModels: 'instance-default',
			workspaceDefaultModels: ['workspace-default']
		});

		assert.equal(resolved.trace.resolverSource, 'ui.default_workspace_preset_id');
		assert.equal(resolved.trace.selectedWorkspacePresetId, 'alba');
	});

	it('falls back to ui.default_models when alba is not visible', () => {
		assert.deepEqual(
			resolveDefaultChatModels({
				models,
				defaultWorkspacePresetId: 'missing-alba',
				instanceDefaultModels: 'instance-default',
				workspaceDefaultModels: ['workspace-default']
			}),
			['instance-default']
		);
	});

	it('falls back to settings.models when higher-priority defaults are unavailable', () => {
		assert.deepEqual(
			resolveDefaultChatModels({
				models,
				defaultWorkspacePresetId: 'missing-alba',
				instanceDefaultModels: 'missing-model',
				workspaceDefaultModels: ['workspace-default']
			}),
			['workspace-default']
		);
	});

	it('falls back to the first visible model when no defaults resolve', () => {
		assert.deepEqual(
			resolveDefaultChatModels({
				models,
				defaultWorkspacePresetId: 'missing-alba',
				instanceDefaultModels: 'missing-model',
				workspaceDefaultModels: ['also-missing']
			}),
			['alba']
		);
	});

	it('returns an empty selection when no visible models exist', () => {
		assert.deepEqual(
			resolveDefaultChatModels({
				models: [
					{
						id: 'hidden-only',
						name: 'Hidden Only',
						owned_by: 'openai',
						info: {
							meta: {
								hidden: true
							}
						}
					}
				],
				defaultWorkspacePresetId: 'alba',
				instanceDefaultModels: 'hidden-only'
			}),
			[]
		);
	});

	it('filters invalid and hidden selected models', () => {
		assert.deepEqual(
			sanitizeSelectedChatModels(['hidden-model', 'fallback-public', 'missing-model'], models),
			['fallback-public']
		);
	});

	it('marks explicit selections as selected_models in trace metadata', () => {
		assert.deepEqual(
			buildSelectedModelTrace({
				selectedModels: ['fallback-public'],
				defaultWorkspacePresetId: 'alba',
				instanceDefaultModels: 'instance-default',
				workspaceDefaultModels: ['workspace-default']
			}),
			{
				selectedWorkspacePresetId: 'fallback-public',
				resolverSource: 'selected_models',
				configTrace: {
					'ui.default_workspace_preset_id': ['alba'],
					'ui.default_models': ['instance-default'],
					'settings.models': ['workspace-default']
				}
			}
		);
	});
});

describe('chat ui text overrides', () => {
	it('uses the configured chat input placeholder when present', () => {
		assert.equal(
			getChatInputPlaceholder('Келья: начни с "Сейчас у меня..."', 'Send a Message'),
			'Келья: начни с "Сейчас у меня..."'
		);
	});

	it('falls back to the default placeholder when no override is set', () => {
		assert.equal(getChatInputPlaceholder('', 'Send a Message'), 'Send a Message');
	});

	it('falls back to the configured default no-models message when override is blank', () => {
		assert.equal(
			getNoModelsMessage('', 'Нет доступных моделей; обратитесь к администратору'),
			'Нет доступных моделей; обратитесь к администратору'
		);
	});

	it('uses the configured no-models message when present', () => {
		assert.equal(
			getNoModelsMessage(
				'Нет моделей; обратитесь к администратору',
				'No models available; contact admin'
			),
			'Нет моделей; обратитесь к администратору'
		);
	});
});

describe('onboarding visibility', () => {
	it('does not render suggestions when ui.show_suggested_prompts is false', () => {
		assert.equal(
			shouldShowSuggestedPrompts({
				showSuggestedPrompts: false,
				suggestionPrompts: [{ content: 'Что ты умеешь?', title: ['', ''] }]
			}),
			false
		);
	});

	it('keeps suggestions disabled after a mocked config reload', () => {
		const initialConfig = {
			show_suggested_prompts: false,
			show_welcome_panel: false,
			default_prompt_suggestions: [{ content: 'Что ты умеешь?', title: ['', ''] }]
		};
		const reloadedConfig = JSON.parse(JSON.stringify(initialConfig));

		assert.equal(
			shouldShowSuggestedPrompts({
				showSuggestedPrompts: initialConfig.show_suggested_prompts,
				suggestionPrompts: initialConfig.default_prompt_suggestions
			}),
			false
		);
		assert.equal(
			shouldShowSuggestedPrompts({
				showSuggestedPrompts: reloadedConfig.show_suggested_prompts,
				suggestionPrompts: reloadedConfig.default_prompt_suggestions
			}),
			false
		);
		assert.equal(shouldShowWelcomePanel(reloadedConfig.show_welcome_panel), false);
	});
});
