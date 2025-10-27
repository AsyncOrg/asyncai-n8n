import {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export const VoiceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a voice',
				description: 'Returns metadata about a specific voice',
				routing: {
					request: {
						method: 'GET',
						url: '={{"/voices/"  + $parameter["voice"] }}',
					},
					output: {
						postReceive: [
							{
								type: 'setKeyValue',
								enabled: '={{$parameter["simplify"]}}',
								properties: {
									voice_id: '={{$responseItem.voice_id}}',
									name: '={{$responseItem.name}}',
									category: '={{$responseItem.category}}',
									labels: '={{$responseItem.labels}}',
									description: '={{$responseItem.description}}',
									preview_url: '={{$responseItem.preview_url}}',
								},
							},
						],
					},
				},
			},
			{
				name: 'Create Clone',
				value: 'createClone',
				action: 'Create a voice clone',
				description: 'Create a voice clone from audio files',
				routing: {
					send: {
						preSend: [ preSendAudioFiles ],
					},
					request: {
						url: '/voices/clone',
						returnFullResponse: true,
						method: 'POST',
						headers: {
							'Content-Type': 'multipart/form-data',
						},
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a voice',
				description: 'Delete a specific voice',
				routing: {
					request: {
						url: '={{"/voices/" + $parameter["voice"]}}',
						method: 'DELETE',
					},
				},
			},
		],
		default: 'get',
		displayOptions: {
			show: {
				resource: ['voice'],
			},
		},
	}
]

export const VoiceFields: INodeProperties[] = [
	{
		displayName: 'Voice',
		description: 'The voice you want to use',
		name: 'voice',
		type: 'resourceLocator',
		default: { mode: 'list', value: null },
		displayOptions: {
			show: {
				resource: ['voice'],
				operation: ['delete', 'get'],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'listVoices',
					searchable: true,
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: 'e0f39dc4-f691-4e78-bba5-5c636692cc04',
			},
		],
		required: true,
	},
	// Create Clone
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		placeholder: 'e.g. Anthony',
		description: 'The name of the cloned voice',
		displayOptions: {
			show: {
				resource: ['voice'],
				operation: ['createClone'],
			},
		},
	},
	{
		displayName: 'Audio Files',
		name: 'audioFiles',
		type: 'string',
		default: '',
		placeholder: 'data',
		description: 'The audio files to be used for voice cloning',
		displayOptions: {
			show: {
				resource: ['voice'],
				operation: ['createClone'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Fields',
		displayOptions: {
			show: {
				resource: ['voice'],
				operation: ['createClone'],
			},
		},
		options: [
			{
				displayName: 'Accent',
				description: 'An accent of the voice',
				name: 'accent',
				type: 'string',
				default: ``,
				placeholder: 'e.g. American (US)',
			},
			{
				displayName: 'Description',
				description: 'A description of the voice',
				name: 'description',
				type: 'string',
				default: ``,
				placeholder: 'e.g. Calm, neutral-tone female voice',
			},
			{
				displayName: 'Enhance',
				description: 'Whether to enhance (remove background noise of) the audio clip before cloning',
				name: 'enhance',
				type: 'boolean',
				default: false
			},
			{
				displayName: 'Gender',
				description: 'Gender of the voice',
				name: 'gender',
				type: 'options',
				default: 'Male',
				options: [
					{ name: 'Male', value: 'Male'},
					{ name: 'Female', value: 'Female'},
					{ name: 'Neutral', value: 'Neutral'},

				],
			},
			{
				displayName: 'Style',
				description: 'Voice style(s), comma-separated',
				name: 'style',
				type: 'string',
				default: ``,
				placeholder: 'Voice style(s), comma-separated',
			},
		],
	},

];

async function preSendAudioFiles(this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions> {
	const formData = new FormData();
	const binaryData = this.getNodeParameter('audioFiles', '') as string;
	const fileBuffer = await this.helpers.getBinaryDataBuffer(binaryData);
	const name = this.getNodeParameter('name') as string;

	const description = this.getNodeParameter('additionalFields.description', '') as string;

	const accent = this.getNodeParameter('additionalFields.accent', '') as string;
	const style = this.getNodeParameter('additionalFields.style', '') as string;
	const enhance = this.getNodeParameter('additionalFields.enhance', false) as boolean
	const gender = this.getNodeParameter('additionalFields.gender', '') as string;
	formData.append('name', name);
	formData.append('description', description);
	formData.append('accent', accent);
	formData.append('style', style);
	formData.append('enhance', enhance);
	formData.append('gender', gender);
	formData.append('files', new Blob([fileBuffer]));

	requestOptions.body = formData;

	return requestOptions;
}