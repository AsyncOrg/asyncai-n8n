import { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { VoiceOperations, VoiceFields } from './Descriptions/voice';
import { listSearch } from './Descriptions/utils';
import { SpeechFields, SpeechOperations } from './Descriptions/speech';

export class AsyncAi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Async',
		name: 'asyncAi',
		icon: 'file:async.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Async API',
		defaults: {
			name: 'Async',
		},
		usableAsTool: true,
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'asyncAIApi',
				required: true,
			},
		],
		requestDefaults: {
			method: 'GET',
			baseURL: 'https://api.async.com/',
			headers: {
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Voice',
						value: 'voice',
					},
					{
						name: 'Speech',
						value: 'speech',
					},
				],
				default: 'voice',
			},
			...VoiceOperations,
			...VoiceFields,
			...SpeechOperations,
			...SpeechFields,
		]
	};

	methods = {
		listSearch,
	};
}
