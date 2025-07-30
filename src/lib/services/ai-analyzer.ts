import type { GitHubFile } from '$types/repository';
import type {
  AnalysisResult,
  SubsystemDescription,
  OpenAIResponse,
  FileInterface,
  CitationLink
} from '$types/analysis';

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
 * Generates AI-powered architecture description for the entire repository
 */
export async function generateArchitectureDescription(analysisResult: AnalysisResult): Promise<string> {
  const prompt = `Analyze the architecture of this ${analysisResult.framework} repository called "${analysisResult.metadata.full_name}":

Subsystems:
${analysisResult.subsystems
  .map((s) => {
    const fileCount = Array.isArray(s.files) ? s.files.length : 0;
    return `- ${s.name}: ${fileCount} files`;
  })
  .join("\n")}

Framework: ${analysisResult.framework}
Total Files: ${analysisResult.fileCount}

Provide a clear, technical explanation of:
1. The overall architecture pattern used
2. How the subsystems interact with each other
3. The data flow through the application
4. Key architectural decisions and benefits
5. Areas where developers should focus for maintenance

Keep it practical and focused on helping developers understand the codebase structure.`;

  const response = await makeOpenAIRequest(prompt);

  if (response.success && response.data) {
    return response.data.trim();
  }

  // Fallback description when AI fails
  return `This ${analysisResult.framework} repository is organized into ${analysisResult.subsystems.length} main subsystems:

${analysisResult.subsystems
  .map((s) => {
    const fileCount = Array.isArray(s.files) ? s.files.length : 0;
    return `**${s.name}**: Contains ${fileCount} files focused on ${s.description.toLowerCase()}`;
  })
  .join("\n\n")}

The architecture follows common ${analysisResult.framework} patterns with clear separation of concerns. Each subsystem has a specific responsibility, making the codebase maintainable and scalable.`;
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
      // Get actual file objects from fileTree using the file paths
      const subsystemFiles = subsystem.files.map(filePath => basicAnalysis.fileTree[filePath]).filter(Boolean);
      const description = await generateSubsystemDescription(
        subsystem.name,
        subsystemFiles,
        basicAnalysis
      );
      subsystemDescriptions.push(description);
    }

    // Extract key interfaces and exports
    const keyInterfaces = extractKeyInterfaces(files);

    // Generate citations for important files
    const citations: CitationLink[] = [];
    const importantFiles = [
      ...basicAnalysis.mainFiles.map(path => basicAnalysis.fileTree[path]).filter(Boolean),
      ...basicAnalysis.configFiles.slice(0, 3).map(path => basicAnalysis.fileTree[path]).filter(Boolean),
      ...basicAnalysis.documentationFiles.slice(0, 3).map(path => basicAnalysis.fileTree[path]).filter(Boolean)
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