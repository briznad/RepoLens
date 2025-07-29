import type {
  GitHubFile,
  AnalysisResult,
  SubsystemDescription,
  OpenAIResponse,
  FileInterface,
  CitationLink
} from '$types';

import { analyzeRepo, extractKeyInterfaces, generateInlineCitations } from '$utilities/repo-analyzer';

/**
 * Makes a request to OpenAI API with proper error handling
 */
export async function makeOpenAIRequest(prompt: string, model: string = 'gpt-4o-mini'): Promise<OpenAIResponse> {
  try {
    // Use our internal API endpoint instead of calling OpenAI directly
    const response = await fetch('/api/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        model
      })
    });

    if (!response.ok) {
      return {
        success: false,
        error: `API request failed: ${response.status} ${response.statusText}`
      };
    }

    const data = await response.json();
    
    if (data.success) {
      return {
        success: true,
        data: data.message || data.data || '',
        usage: data.usage || {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0
        }
      };
    } else {
      return {
        success: false,
        error: data.error || 'Unknown error occurred'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error occurred'
    };
  }
}

/**
 * Generates AI-powered description for a subsystem using OpenAI
 */
export async function generateSubsystemDescription(
  subsystemName: string,
  files: GitHubFile[],
  repoContext: AnalysisResult
): Promise<SubsystemDescription> {
  const fileList = files.slice(0, 10).map(f => f.path).join('\n');
  const framework = repoContext.framework;
  const repoName = repoContext.metadata.full_name;

  const prompt = `Analyze this ${subsystemName} subsystem in a ${framework} repository called "${repoName}".

Files in this subsystem:
${fileList}

Repository context:
- Main language: ${repoContext.metadata.language || 'Mixed'}
- Framework: ${framework}
- Total files: ${repoContext.fileCount}

Please provide a concise analysis in this JSON format:
{
  "description": "Brief description of what this subsystem does",
  "purpose": "Main purpose and responsibility",
  "keyFiles": ["array", "of", "most", "important", "files"],
  "entryPoints": ["main", "entry", "points"],
  "technologies": ["relevant", "technologies", "used"],
  "dependencies": ["key", "dependencies"]
}

Keep descriptions concise and focus on practical information for developers.`;

  const response = await makeOpenAIRequest(prompt);

  if (!response.success || !response.data) {
    // Fallback to basic analysis if OpenAI fails
    return {
      name: subsystemName,
      description: `${subsystemName} files and components`,
      keyFiles: files.slice(0, 5).map(f => f.path),
      entryPoints: files.filter(f =>
        f.path.includes('index') || f.path.includes('main') || f.path.includes('app')
      ).map(f => f.path),
      purpose: `Handles ${subsystemName.toLowerCase()} functionality`,
      technologies: [framework],
      dependencies: []
    };
  }

  try {
    const parsed = JSON.parse(response.data);
    return {
      name: subsystemName,
      description: parsed.description || `${subsystemName} files and components`,
      keyFiles: parsed.keyFiles || files.slice(0, 5).map(f => f.path),
      entryPoints: parsed.entryPoints || [],
      purpose: parsed.purpose || `Handles ${subsystemName.toLowerCase()} functionality`,
      technologies: parsed.technologies || [framework],
      dependencies: parsed.dependencies || []
    };
  } catch (parseError) {
    console.warn('Failed to parse OpenAI response, using fallback', parseError);
    return {
      name: subsystemName,
      description: `${subsystemName} files and components`,
      keyFiles: files.slice(0, 5).map(f => f.path),
      entryPoints: [],
      purpose: `Handles ${subsystemName.toLowerCase()} functionality`,
      technologies: [framework],
      dependencies: []
    };
  }
}

/**
 * Enhanced main analysis function with AI integration and full TypeScript support
 */
export async function analyzeRepoWithAI(repoData: any, files: GitHubFile[] | (GitHubFile & { content?: string })[]): Promise<AnalysisResult> {
  // Get basic analysis first
  const basicAnalysis = analyzeRepo(repoData, files);

  try {
    // Generate AI descriptions for each subsystem
    const subsystemDescriptions: SubsystemDescription[] = [];
    for (const subsystem of basicAnalysis.subsystems) {
      const description = await generateSubsystemDescription(
        subsystem.name,
        subsystem.files,
        basicAnalysis
      );
      subsystemDescriptions.push(description);
    }

    // Extract key interfaces and exports
    const keyInterfaces = extractKeyInterfaces(files);

    // Generate citations for important files
    const citations: CitationLink[] = [];
    const importantFiles = [
      ...basicAnalysis.mainFiles,
      ...basicAnalysis.configFiles.slice(0, 3),
      ...basicAnalysis.documentationFiles.slice(0, 3)
    ];

    const [owner, repo] = repoData.full_name.split('/');
    for (const file of importantFiles) {
      citations.push(generateInlineCitations(file.path, owner, repo));
    }

    // Add interface citations
    for (const iface of keyInterfaces.slice(0, 10)) {
      citations.push(generateInlineCitations(
        iface.filePath,
        owner,
        repo,
        iface.lineNumber,
        `${iface.type}: ${iface.name}`
      ));
    }

    return {
      ...basicAnalysis,
      subsystemDescriptions,
      keyInterfaces,
      citations
    };

  } catch (error) {
    console.warn('AI analysis failed, returning basic analysis:', error);
    return basicAnalysis;
  }
}