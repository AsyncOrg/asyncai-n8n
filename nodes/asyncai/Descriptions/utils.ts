import { ILoadOptionsFunctions, INodeListSearchItems, INodeListSearchResult } from "n8n-workflow";

interface AsyncAIVoiceResponse {
  voices: {
    name: string;
    voice_id: string;
  }[];
}

export const listSearch = {
	async listVoices(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
		const voicesResponse = await this.helpers.httpRequestWithAuthentication.call(this, 'asyncAIApi', {
			method: 'POST',
			url: 'https://api.async.com/voices',
		}) as AsyncAIVoiceResponse;

		const returnData: INodeListSearchItems[] = voicesResponse.voices.map(
			(voice) => ({
				name: voice.name,
				value: voice.voice_id,
			})
		);
		return {
			results: returnData,
		};
	},
};
