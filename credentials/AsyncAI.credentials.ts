import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class AsyncAI implements ICredentialType {
	name = 'asyncAIApi';
	displayName = 'AsyncAI API';
	documentationUrl = 'https://docs.async.ai/';
	properties: INodeProperties[] = [
		{
			displayName: 'AsyncAI API Key',
			name: 'xApiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'x-api-key': '={{$credentials.xApiKey}}',
			},
		},
	};

	test: ICredentialTestRequest | undefined = {
		request: {
			baseURL: 'https://api.async.ai',
			url: '/voices',
			method: 'POST',
		},
	};
}
