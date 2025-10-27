import { IExecuteSingleFunctions, IHttpRequestOptions, IN8nHttpFullResponse, INodeExecutionData, INodeProperties } from "n8n-workflow";

export const SpeechOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Text to Speech',
				value: 'textToSpeech',
				description: 'Converts text into speech and returns audio',
				action: 'Convert text to speech',
				routing: {
					request: {
						method: 'POST',
						url: '={{"/text_to_speech"}}',
						headers: { 'content-type': 'application/json' },
						returnFullResponse: true,
						encoding: 'arraybuffer',
					},
					send: {
						preSend: [ preSendTexttoSpeech ],
					},
					output: {
						postReceive: [ returnBinaryData ],
					}
					}
								},
							],
							default: 'textToSpeech',
							displayOptions: {
								show: {
									resource: ['speech'],
								},
							},
						}
					];

export const SpeechFields: INodeProperties[] = [
	{
		displayName: 'Voice',
		description: 'Select the voice to use for the conversion',
		name: 'voice',
		type: 'resourceLocator',
		default: { mode: 'list', value: null },
		displayOptions: {
			show: {
				resource: ['speech'],
				operation: ['textToSpeech'],
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
		routing: {
		send: {
				type: 'body',
				property: 'voice',
				value: '={{ (function(v){ return { mode: "id", id: (typeof v==="string" ? v : (v && v.id) || (v && v.value && (v.value.id || v.value)) || v) }; })($parameter["voice"]) }}',
			},
		},
		required: true,
	},
	{
		displayName: 'Text',
		description: 'The text that will get converted into speech',
		placeholder: 'e.g. The archaeologists discovery would rewrite history.',
		name: 'text',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['speech'],
				operation: ['textToSpeech'],
			},
		},
		required: true,
		routing: {
			send: { type: 'body', property: 'transcript' },
		},
	},
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['speech'],
				operation: ['textToSpeech'],
			},
		},
		options: [
			{
				displayName: 'Bit Rate',
				name: 'bitRate',
				type: 'number',
				typeOptions: { minValue: 32000, maxValue: 320000, numberStepSize: 1000 },
				default: 192000,
				description: 'Only used with MP3',
				displayOptions: {
					show: { outputContainer: ['mp3'] },
				},
			},
			{
				displayName: 'Container',
				name: 'outputContainer',
				description: 'Output audio format',
				type: 'options',
				options: [
					{ name: 'MP3', value: 'mp3' },
					{ name: 'WAV', value: 'wav' },
				],
				default: 'mp3',
			},
			{
				displayName: 'Encoding',
				name: 'encoding',
				description: 'Only used when container is WAV',
				type: 'options',
				default: 'pcm_s16le',
				displayOptions: {
					show: { outputContainer: ['wav'] },
				},
				options: [
					{ name: 'PCM 32bit', value: 'pcm_f32le' },
					{ name: 'PSM 16bit', value: 'pcm_s16le' },
				],
			},
			{
				displayName: 'Model',
				description: 'Select the model to use for the conversion',
				name: 'model',
				type: 'options',
				default: 'asyncflow_multilingual_v1.0',
				options: [
						{ name: 'AsyncFlow V2', value: 'asyncflow_v2.0', description: 'English only' },
						{ name: 'AsyncFlow Multilingual V1', value: 'asyncflow_multilingual_v1.0', description: 'Multilingual' },
					],
				routing: {
					send: {
						type: 'body',
						property: 'model_id',
					},
				},
			},
			{
				displayName: 'Sample Rate',
				name: 'sampleRate',
				type: 'number',
				typeOptions: { minValue: 8000, maxValue: 48000, numberStepSize: 1000 },
				default: 44100,
				description: 'Output audio sample rate (Hz)',
			},
		],
	},
];

async function returnBinaryData<PostReceiveAction>(
  this: IExecuteSingleFunctions,
  items: INodeExecutionData[],
  responseData: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
  const op = this.getNodeParameter('operation') as string;

  // Try to detect if we actually got JSON (error) instead of audio
  const contentType = (responseData.headers?.['content-type'] || responseData.headers?.['Content-Type'] || '').toString();
  const buf = responseData.body as Buffer;

  // Heuristic: JSON error from API?
  if (contentType.includes('application/json') || (buf?.length && buf[0] === 0x7B /* '{' */)) {
    // Try to parse and surface the error cleanly
    try {
      const text = buf.toString('utf8');
      const json = JSON.parse(text);
      throw new Error(`Async TTS returned JSON instead of audio: ${json.message || text}`);
    } catch {
      throw new Error(`Async TTS returned non-audio response: ${buf.toString('utf8').slice(0, 400)}...`);
    }
  }

  // Pick filename + mime from headers (fallback to mp3)
  const isMp3 = contentType.includes('audio/mpeg') || contentType.includes('audio/mp3');
  const ext = isMp3 ? 'mp3' : (contentType.includes('audio') ? 'wav' : 'bin');
  const mime = isMp3 ? 'audio/mpeg' : (contentType.includes('audio') ? contentType : 'application/octet-stream');

  const binaryData = await this.helpers.prepareBinaryData(
    buf,
    `audio.${op}.${ext}`,
    mime,
  );

  return items.map(() => ({ json: responseData.headers, binary: { data: binaryData } }));
}

async function preSendTexttoSpeech(
  this: IExecuteSingleFunctions,
  requestOptions: IHttpRequestOptions
): Promise<IHttpRequestOptions> {
  // Gather user selections from the collection (only added fields will appear)
  const opts = (this.getNodeParameter('additionalOptions', 0, {}) || {}) as {
    model?: string;
    outputContainer?: 'mp3' | 'wav';
    encoding?: 'pcm_f32le' | 'pcm_s16le';
    sampleRate?: number;
    bitRate?: number;
  };

  // Ensure body exists
  const body: any = requestOptions.body ?? (requestOptions.body = {});

  // Ensure model_id exists (fallback if user didn’t add the Model option)
  if (!body.model_id) {
    body.model_id = opts.model ?? 'asyncflow_multilingual_v1.0';
  }

  // Build output_format based on container + optional fields
  const container = opts.outputContainer ?? 'mp3'; // default
  const output_format: any = { container };

  // sample_rate is applicable to both containers (Async requires it)
  output_format.sample_rate = opts.sampleRate ?? 44100;

  if (container === 'wav') {
    // For WAV: use encoding, but NEVER bit_rate
    output_format.encoding = opts.encoding ?? 'pcm_s16le';
  } else if (container === 'mp3') {
    // For MP3: use bit_rate, but NEVER encoding
    output_format.bit_rate = opts.bitRate ?? 192000;
  }

  body.output_format = output_format;

  return requestOptions;
}