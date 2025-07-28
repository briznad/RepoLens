import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
  try {
    const { message, repoId, repositoryData, analysisData } = await request.json();
    
    if (!message || !repoId || !repositoryData || !analysisData) {
      return json(
        { error: 'Missing required fields: message, repoId, repositoryData, or analysisData' },
        { status: 400 }
      );
    }

    // Get API key from environment
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      return json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      );
    }

    // Create documentation-focused system prompt
    const systemPrompt = createSystemPrompt(repositoryData, analysisData, repoId);
    
    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        temperature: 0.3,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: message
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Anthropic API error:', error);
      return json(
        { error: 'Failed to generate response from AI service' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const assistantMessage = data.content?.[0]?.text || 'I apologize, but I could not generate a response.';

    return json({
      success: true,
      message: assistantMessage,
      usage: {
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0
      }
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Creates a documentation-focused system prompt for Iris
 * @param {Object} repositoryData - Repository metadata from Firestore
 * @param {Object} analysisData - Repository analysis results
 * @param {string} repoId - Repository document ID
 * @returns {string} System prompt for Iris
 */
function createSystemPrompt(repositoryData, analysisData, repoId) {
  const repoName = repositoryData.fullName || repositoryData.name;
  const framework = analysisData.framework || 'unknown';
  const subsystems = analysisData.subsystems || [];
  const mainFiles = analysisData.mainFiles || [];
  const keyInterfaces = analysisData.keyInterfaces || [];
  
  // Create subsystem summaries
  const subsystemSummaries = subsystems.map(subsystem => {
    const description = analysisData.subsystemDescriptions?.find(
      desc => desc.name === subsystem.name
    );
    
    return `- **${subsystem.name}**: ${description?.description || subsystem.description} (${subsystem.files.length} files)
  Entry points: ${description?.entryPoints?.join(', ') || 'N/A'}
  Key files: ${description?.keyFiles?.slice(0, 3).join(', ') || subsystem.files.slice(0, 3).map(f => f.path.split('/').pop()).join(', ')}`;
  }).join('\n');

  // Create key interfaces summary
  const interfacesSummary = keyInterfaces.slice(0, 10).map(iface => 
    `- ${iface.type}: \`${iface.name}\` in ${iface.filePath}`
  ).join('\n');

  // Create main files summary
  const mainFilesSummary = mainFiles.map(file => `- ${file.path}`).join('\n');

  return `You are Iris, a documentation assistant for the ${repoName} repository. Your primary role is to help users navigate and understand the repository's documentation.

## Repository Context
- **Repository**: ${repoName}
- **Framework**: ${framework}
- **Total Files**: ${analysisData.fileCount || 0}
- **Subsystems**: ${subsystems.length}
- **GitHub URL**: ${repositoryData.url}

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
- Include links to documentation pages using the format: \`[Subsystem Name](/repo/${repoId}/docs/SubsystemName)\`
- Reference GitHub files using: \`[filename](${repositoryData.url}/blob/main/path/to/file)\`
- Keep responses concise and actionable (under 300 words typically)
- Use a professional but friendly tone

### File References:
When referencing files, always provide GitHub links in this format:
\`[filename](${repositoryData.url}/blob/main/path/to/file)\`

### Example Response Pattern:
"Based on your question about [topic], I'd recommend checking out the [Subsystem Name](/repo/${repoId}/docs/SubsystemName) documentation page. The main logic is implemented in [key-file.js](${repositoryData.url}/blob/main/src/key-file.js)."

### What You Should NOT Do:
- Don't write code unless specifically asked
- Don't make assumptions about files or functions not mentioned in the context
- Don't provide installation or setup instructions (focus on existing code understanding)
- Don't replace the documentation - supplement and guide users to it

Remember: You are a documentation assistant, not a code generator. Your job is to help users understand and navigate the existing codebase and documentation.`;
}