import type { LanguageModel, CoreUserMessage, CoreAssistantMessage, TextPart, FilePart } from 'ai';

import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

import { ANTHROPIC_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY } from '$env/static/private';

type Opts = {
	system?           : string;
	responsePreamble? : string;
	providerName?     : 'anthropic' | 'google';
};

const providers = {
	anthropic : {
		generator : createAnthropic,
		apiKey    : ANTHROPIC_API_KEY,
		modelName : 'claude-3-5-haiku-20241022',
	},
	google : {
		generator : createGoogleGenerativeAI,
		apiKey    : GOOGLE_GENERATIVE_AI_API_KEY,
		modelName : 'gemini-2.0-flash-lite',
	},
};

export async function getGenerativeText(data : string | File[], passedOpts? : Opts) : Promise<string | null> {
	const opts : Opts = {
		...(passedOpts ?? {}),
	};

	if (!opts.providerName) {
		opts.providerName = 'google'; // Default to Google if no provider is specified
	}

	const { modelName, model } = getModel(opts.providerName);

	const requestPayload : any = {
		model,
		messages : await getMessages(data, opts.responsePreamble),
	};

	if (requestPayload.messages.length === 0) {
		console.error('No messages provided for the request.');

		return null;
	}

	if (opts.system) {
		requestPayload.system = opts.system;
	}

	const start = Date.now();

	let output : string = '';

	try {
		const response = await generateText(requestPayload);

		output = (response?.steps?.[0]?.text ?? '').trim();

		if (!output) {
			throw new Error('No output received from the model');
		}
	} catch (error) {
		console.error('Error generating text:', error);

		return null;
	}

	const duration = Date.now() - start;

	console.info(`${ opts.providerName }'s ${ modelName } took ${ duration }ms to generate a response.`);

	return output;
}

function getModel(providerName : 'anthropic' | 'google') : { modelName : string, model : LanguageModel } {
	const { generator, apiKey, modelName } = providers[providerName];

	const provider = generator({ apiKey });

	return {
		modelName,
		model : provider(modelName) as LanguageModel,
	};
}


async function getMessages(data : string | File[], responsePreamble? : string) : Promise<Array<CoreUserMessage | CoreAssistantMessage>> {
	const content : Array<TextPart | FilePart> = await getContent(data);

	if (content.length === 0) {
		console.error('No content provided for the user message.');

		return [];
	}

	const messages : Array<CoreUserMessage | CoreAssistantMessage> = [
		{
			role: 'user',
			content,
    },
	];

	if (responsePreamble) {
		messages.push({
			role: 'assistant',
			content: [
        {
					type: 'text',
					text: responsePreamble,
        },
			],
    });
	}

	return messages;
}

async function getContent(data : string | File[]) : Promise<Array<TextPart | FilePart>> {
	let userMessage : Array<TextPart | FilePart> = [];

	if (typeof data === 'string') {
		userMessage = [{
			type: 'text',
			text: data,
		}];
	} else if (data[0] instanceof File) {
		for (const file of data) {
			const arrayBuffer = await file.arrayBuffer();
			const base64 = Buffer.from(arrayBuffer).toString('base64');

			const mimeType = file.type;
			const data = `data:${mimeType};base64,${base64}`;

			userMessage.push({
				data,
				mimeType,
				type: 'file',
			});
		}
	} else {
		console.error('Invalid data type. Expected string or array of File objects.');
	}

	return userMessage;
}
