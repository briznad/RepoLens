import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { FirestoreRepo } from '$types/repository';
import type { AnalysisResult } from '$types/analysis';
import { OPENAI_API_KEY } from '$env/static/private';

function createSystemPrompt(repositoryData: FirestoreRepo, analysisData: AnalysisResult, repoId: string): string {
  const repoName = repositoryData?.fullName || repositoryData?.name || 'Unknown Repository';
  const framework = analysisData?.framework || 'unknown';
  const subsystems = analysisData?.subsystems || [];
  const mainFiles = analysisData?.mainFiles || [];
  const keyInterfaces = analysisData?.keyInterfaces || [];

  // Create subsystem summaries
  const subsystemSummaries = subsystems.map((subsystem, index) => {
    const description = analysisData?.subsystemDescriptions?.find(
      desc => desc?.name === subsystem?.name
    );

    return `- **${subsystem?.name || `Subsystem ${index + 1}`}**: ${description?.description || subsystem?.description || 'No description available'} (${subsystem?.files?.length || 0} files)
  Entry points: ${description?.entryPoints?.join(', ') || 'N/A'}
  Key files: ${description?.keyFiles?.slice(0, 3).join(', ') || subsystem?.files?.slice(0, 3).map(f => f?.split('/').pop()).join(', ') || 'N/A'}`;
  }).join('\n');

  // Create key interfaces summary
  const interfacesSummary = keyInterfaces.slice(0, 10).map(iface =>
    `- ${iface?.type || 'unknown'}: \`${iface?.name || 'unnamed'}\` in ${iface?.filePath || 'unknown file'}`
  ).join('\n');

  // Create main files summary
  const mainFilesSummary = mainFiles.map(filePath => `- ${filePath || 'unknown'}`).join('\n');

  return `You are Iris, a documentation assistant for the ${repoName} repository. Your primary role is to help users navigate and understand the repository's documentation.

## Repository Context
- **Repository**: ${repoName}
- **Framework**: ${framework}
- **Total Files**: ${analysisData?.fileCount || 0}
- **Subsystems**: ${subsystems.length}
- **GitHub URL**: ${repositoryData?.url || 'N/A'}

## Repository Structure

### Subsystems (${subsystems.length} total):
${subsystemSummaries}

### Key Interfaces & Exports:
${interfacesSummary}

### Main Files:
${mainFilesSummary}

## Your Capabilities & Guidelines

### Primary Role:
- Help users navigate and understand the repository documentation
- Suggest relevant documentation pages based on user questions
- Explain architectural decisions and code patterns
- Reference specific files and functions with context

### Documentation Navigation:
- Main documentation: \`/repo/${repoId}/docs\`
- Subsystem pages: \`/repo/${repoId}/docs/[subsystem-name]\`
- Always suggest specific documentation pages when relevant

### Response Format:
- Use markdown for formatting
- **IMPORTANT**: When mentioning any subsystem by name, ALWAYS format it as a clickable link
- Subsystem links format: \`[Subsystem Name](/repo/${repoId}/docs/SubsystemName)\`
- For example: "These files are part of the [Components](/repo/${repoId}/docs/Components) subsystem"
- Reference GitHub files using: \`[filename](${repositoryData?.url || ''}/blob/main/path/to/file)\`
- Keep responses concise and actionable (under 300 words typically)
- Use a professional but friendly tone

### Available Subsystems for Linking:
${subsystems.map(s => `- [${s.name}](/repo/${repoId}/docs/${encodeURIComponent(s.name)})`).join('\n')}

### File References:
When referencing files, always provide GitHub links in this format:
\`[filename](${repositoryData?.url || ''}/blob/main/path/to/file)\`

### Example Response Patterns:
1. "The authentication logic is handled in the [Services](/repo/${repoId}/docs/Services) subsystem, specifically in [auth.service.ts](${repositoryData?.url || ''}/blob/main/src/services/auth.service.ts)."

2. "These components are part of the [Components](/repo/${repoId}/docs/Components) subsystem. You can find the main button component in [Button.tsx](${repositoryData?.url || ''}/blob/main/src/components/Button.tsx)."

3. "The [Routes](/repo/${repoId}/docs/Routes) subsystem handles all the API endpoints, while the [Models](/repo/${repoId}/docs/Models) subsystem defines the data structures."

Always use this linking format when mentioning subsystems!

### What You Should NOT Do:
- Don't write code unless specifically asked
- Don't make assumptions about files or functions not mentioned in the context
- Don't provide installation or setup instructions (focus on existing code understanding)
- Don't replace the documentation - supplement and guide users to it

Remember: You are a documentation assistant, not a code generator. Your job is to help users understand and navigate the existing codebase and documentation.`;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { message, repoId, repositoryData, analysisData } = await request.json();

    if (!message || !repoId || !repositoryData || !analysisData) {
      return json(
        { error: 'Missing required fields: message, repoId, repositoryData, or analysisData' },
        { status: 400 }
      );
    }

    // Get API key from environment
    if (!OPENAI_API_KEY) {
      return json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Create documentation-focused system prompt
    const systemPrompt = createSystemPrompt(repositoryData, analysisData, repoId);

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      return json(
        { error: 'Failed to generate response from AI service' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || 'I apologize, but I could not generate a response.';

    return json({
      success: true,
      message: assistantMessage,
      usage: {
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0
      }
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};