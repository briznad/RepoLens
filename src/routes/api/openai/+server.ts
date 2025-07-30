import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { OPENAI_API_KEY } from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { prompt, model = 'gpt-4o-mini' } = await request.json();

    if (!prompt) {
      return json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Get API key from environment
    if (!OPENAI_API_KEY) {
      return json(
        { success: false, error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that analyzes code repositories and provides concise, accurate documentation.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      return json(
        { success: false, error: `OpenAI API error: ${response.status}` },
        { status: 500 }
      );
    }

    const data = await response.json();

    return json({
      success: true,
      message: data.choices[0]?.message?.content || '',
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0
      }
    });

  } catch (error) {
    console.error('OpenAI request failed:', error);
    return json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
};