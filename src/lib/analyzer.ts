import type { RepoData, GitHubFile, Framework, Subsystem, SubsystemPattern, AnalysisResult, RepoVersion } from './types';

/**
 * Detects the framework used in a repository based on file patterns and dependencies
 */
export function detectFramework(repoData: RepoData, files: GitHubFile[]): Framework {
  const filePaths = files.map(f => f.path.toLowerCase());
  
  // Check for Next.js first (more specific than React)
  if (filePaths.some(path => path.includes('next.config.js') || path.includes('next.config.ts') || 
                            path.includes('next.config.mjs') || path.includes('next.config.cjs'))) {
    return 'nextjs';
  }
  
  // Check for pages or app directory structure (Next.js)
  if (filePaths.some(path => path.startsWith('pages/') || path.startsWith('app/')) &&
      filePaths.some(path => path.includes('package.json'))) {
    return 'nextjs';
  }
  
  // Check for React
  if (filePaths.some(path => path.includes('package.json'))) {
    // We'll assume React if we find JSX/TSX files and package.json
    const hasReactFiles = filePaths.some(path => 
      path.endsWith('.jsx') || path.endsWith('.tsx')
    );
    if (hasReactFiles) {
      return 'react';
    }
  }
  
  // Check for Svelte
  if (filePaths.some(path => path.endsWith('.svelte')) ||
      filePaths.some(path => path.includes('svelte.config.js') || path.includes('svelte.config.ts'))) {
    return 'svelte';
  }
  
  // Check for Flask
  if (filePaths.some(path => path.includes('app.py') || path.includes('wsgi.py')) ||
      filePaths.some(path => path.includes('requirements.txt') || path.includes('pyproject.toml'))) {
    const hasPythonFiles = filePaths.some(path => path.endsWith('.py'));
    if (hasPythonFiles) {
      // Basic heuristic: if we see Flask-like patterns
      if (filePaths.some(path => path.includes('app.py') || path.includes('run.py'))) {
        return 'flask';
      }
    }
  }
  
  // Check for FastAPI
  if (filePaths.some(path => path.includes('main.py')) &&
      filePaths.some(path => path.includes('requirements.txt') || path.includes('pyproject.toml'))) {
    return 'fastapi';
  }
  
  return 'unknown';
}

/**
 * Framework-specific subsystem patterns
 */
const FRAMEWORK_PATTERNS: Record<Framework, SubsystemPattern[]> = {
  react: [
    {
      name: 'Components',
      description: 'React components and UI elements',
      patterns: ['src/components/', 'components/', 'src/ui/'],
      extensions: ['.jsx', '.tsx', '.js', '.ts'],
      priority: 1
    },
    {
      name: 'Pages/Routes',
      description: 'Page components and routing logic',
      patterns: ['src/pages/', 'pages/', 'src/routes/', 'routes/', 'src/views/', 'views/'],
      extensions: ['.jsx', '.tsx', '.js', '.ts'],
      priority: 2
    },
    {
      name: 'Hooks',
      description: 'Custom React hooks',
      patterns: ['src/hooks/', 'hooks/', 'src/lib/hooks/'],
      extensions: ['.js', '.ts', '.jsx', '.tsx'],
      priority: 3
    },
    {
      name: 'Services/API',
      description: 'API calls and external services',
      patterns: ['src/services/', 'services/', 'src/api/', 'api/', 'src/lib/api/'],
      extensions: ['.js', '.ts'],
      priority: 4
    },
    {
      name: 'Utils',
      description: 'Utility functions and helpers',
      patterns: ['src/utils/', 'utils/', 'src/lib/', 'lib/', 'src/helpers/', 'helpers/'],
      extensions: ['.js', '.ts'],
      priority: 5
    },
    {
      name: 'Context/State',
      description: 'State management and context providers',
      patterns: ['src/context/', 'context/', 'src/store/', 'store/', 'src/state/', 'state/'],
      extensions: ['.js', '.ts', '.jsx', '.tsx'],
      priority: 6
    }
  ],
  nextjs: [
    {
      name: 'Pages/Routes',
      description: 'Next.js pages and app router routes',
      patterns: ['pages/', 'app/', 'src/pages/', 'src/app/'],
      extensions: ['.jsx', '.tsx', '.js', '.ts'],
      priority: 1
    },
    {
      name: 'Components',
      description: 'React components and UI elements',
      patterns: ['src/components/', 'components/', 'src/ui/', 'ui/'],
      extensions: ['.jsx', '.tsx', '.js', '.ts'],
      priority: 2
    },
    {
      name: 'API Routes',
      description: 'Next.js API routes',
      patterns: ['pages/api/', 'app/api/', 'src/pages/api/', 'src/app/api/'],
      extensions: ['.js', '.ts'],
      priority: 3
    },
    {
      name: 'Hooks',
      description: 'Custom React hooks',
      patterns: ['src/hooks/', 'hooks/', 'src/lib/hooks/'],
      extensions: ['.js', '.ts', '.jsx', '.tsx'],
      priority: 4
    },
    {
      name: 'Services/API',
      description: 'API calls and external services',
      patterns: ['src/services/', 'services/', 'src/lib/api/', 'lib/api/'],
      extensions: ['.js', '.ts'],
      priority: 5
    },
    {
      name: 'Utils',
      description: 'Utility functions and helpers',
      patterns: ['src/utils/', 'utils/', 'src/lib/', 'lib/', 'src/helpers/', 'helpers/'],
      extensions: ['.js', '.ts'],
      priority: 6
    }
  ],
  svelte: [
    {
      name: 'Routes',
      description: 'SvelteKit routes and pages',
      patterns: ['src/routes/', 'routes/'],
      extensions: ['.svelte', '.js', '.ts'],
      priority: 1
    },
    {
      name: 'Components',
      description: 'Svelte components',
      patterns: ['src/lib/components/', 'src/components/', 'components/', 'src/lib/'],
      extensions: ['.svelte'],
      priority: 2
    },
    {
      name: 'Stores',
      description: 'Svelte stores for state management',
      patterns: ['src/lib/stores/', 'src/stores/', 'stores/'],
      extensions: ['.js', '.ts'],
      priority: 3
    },
    {
      name: 'Actions',
      description: 'Form actions and server-side logic',
      patterns: ['src/lib/actions/', 'src/actions/', 'actions/'],
      extensions: ['.js', '.ts'],
      priority: 4
    },
    {
      name: 'Utils',
      description: 'Utility functions and helpers',
      patterns: ['src/lib/utils/', 'src/utils/', 'utils/', 'src/lib/'],
      extensions: ['.js', '.ts'],
      priority: 5
    }
  ],
  flask: [
    {
      name: 'Routes/Endpoints',
      description: 'Flask routes and API endpoints',
      patterns: ['app/', 'src/', 'routes/', 'views/', 'blueprints/'],
      extensions: ['.py'],
      priority: 1
    },
    {
      name: 'Models',
      description: 'Database models and schemas',
      patterns: ['models/', 'app/models/', 'src/models/'],
      extensions: ['.py'],
      priority: 2
    },
    {
      name: 'Services',
      description: 'Business logic and services',
      patterns: ['services/', 'app/services/', 'src/services/'],
      extensions: ['.py'],
      priority: 3
    },
    {
      name: 'Utils',
      description: 'Utility functions and helpers',
      patterns: ['utils/', 'helpers/', 'app/utils/', 'src/utils/'],
      extensions: ['.py'],
      priority: 4
    },
    {
      name: 'Config',
      description: 'Configuration files',
      patterns: ['config/', 'app/config/', 'src/config/'],
      extensions: ['.py', '.json', '.yaml', '.yml'],
      priority: 5
    },
    {
      name: 'Auth',
      description: 'Authentication and authorization',
      patterns: ['auth/', 'app/auth/', 'src/auth/'],
      extensions: ['.py'],
      priority: 6
    }
  ],
  fastapi: [
    {
      name: 'Routes/Endpoints',
      description: 'FastAPI routes and API endpoints',
      patterns: ['app/', 'src/', 'routers/', 'routes/', 'api/'],
      extensions: ['.py'],
      priority: 1
    },
    {
      name: 'Models',
      description: 'Pydantic models and database schemas',
      patterns: ['models/', 'app/models/', 'src/models/', 'schemas/'],
      extensions: ['.py'],
      priority: 2
    },
    {
      name: 'Services',
      description: 'Business logic and services',
      patterns: ['services/', 'app/services/', 'src/services/'],
      extensions: ['.py'],
      priority: 3
    },
    {
      name: 'Utils',
      description: 'Utility functions and helpers',
      patterns: ['utils/', 'helpers/', 'app/utils/', 'src/utils/'],
      extensions: ['.py'],
      priority: 4
    },
    {
      name: 'Config',
      description: 'Configuration files',
      patterns: ['config/', 'app/config/', 'src/config/'],
      extensions: ['.py', '.json', '.yaml', '.yml'],
      priority: 5
    },
    {
      name: 'Auth',
      description: 'Authentication and authorization',
      patterns: ['auth/', 'app/auth/', 'src/auth/'],
      extensions: ['.py'],
      priority: 6
    }
  ],
  unknown: []
};

/**
 * Categorizes files into subsystems based on framework patterns
 */
export function categorizeFiles(files: GitHubFile[], framework: Framework): Subsystem[] {
  const patterns = FRAMEWORK_PATTERNS[framework] || [];
  const subsystems: Subsystem[] = [];
  const categorizedFiles = new Set<string>();
  
  // Sort patterns by priority to ensure more specific patterns are matched first
  const sortedPatterns = [...patterns].sort((a, b) => a.priority - b.priority);
  
  for (const pattern of sortedPatterns) {
    const matchingFiles = files.filter(file => {
      // Skip if already categorized
      if (categorizedFiles.has(file.path)) {
        return false;
      }
      
      // Check if file matches any of the path patterns
      const pathMatches = pattern.patterns.some(p => 
        file.path.toLowerCase().includes(p.toLowerCase())
      );
      
      // Check if file has matching extension (if specified)
      const extensionMatches = !pattern.extensions || 
        pattern.extensions.some(ext => file.path.toLowerCase().endsWith(ext));
      
      return pathMatches && extensionMatches && file.type === 'blob';
    });
    
    if (matchingFiles.length > 0) {
      subsystems.push({
        name: pattern.name,
        description: pattern.description,
        files: matchingFiles,
        pattern: pattern.patterns.join(', ')
      });
      
      // Mark files as categorized
      matchingFiles.forEach(file => categorizedFiles.add(file.path));
    }
  }
  
  // Add uncategorized files to a general subsystem if any exist
  const uncategorizedFiles = files.filter(file => 
    !categorizedFiles.has(file.path) && file.type === 'blob'
  );
  
  if (uncategorizedFiles.length > 0) {
    subsystems.push({
      name: 'Other',
      description: 'Files that don\'t fit into specific categories',
      files: uncategorizedFiles,
      pattern: 'Various paths'
    });
  }
  
  return subsystems;
}

/**
 * Main analysis function that processes a repository
 */
export function analyzeRepo(repoData: RepoData, files: GitHubFile[]): AnalysisResult {
  // Detect framework
  const framework = detectFramework(repoData, files);
  
  // Categorize files into subsystems
  const subsystems = categorizeFiles(files, framework);
  
  // Calculate language distribution
  const languages: Record<string, number> = {};
  files.forEach(file => {
    if (file.type === 'blob' && file.size) {
      const extension = file.path.split('.').pop()?.toLowerCase();
      if (extension) {
        // Map extensions to languages
        const languageMap: Record<string, string> = {
          'js': 'JavaScript',
          'jsx': 'JavaScript',
          'ts': 'TypeScript', 
          'tsx': 'TypeScript',
          'py': 'Python',
          'svelte': 'Svelte',
          'html': 'HTML',
          'css': 'CSS',
          'scss': 'SCSS',
          'json': 'JSON',
          'md': 'Markdown',
          'yml': 'YAML',
          'yaml': 'YAML'
        };
        
        const language = languageMap[extension] || extension.toUpperCase();
        languages[language] = (languages[language] || 0) + (file.size || 0);
      }
    }
  });
  
  // Categorize special files
  const mainFiles = files.filter(file => 
    ['readme.md', 'index.js', 'index.ts', 'main.py', 'app.py', 'index.html', 'package.json'].includes(file.path.toLowerCase())
  );
  
  const configFiles = files.filter(file => {
    const path = file.path.toLowerCase();
    return path.includes('config') || path.endsWith('.config.js') || path.endsWith('.config.ts') ||
           path.includes('package.json') || path.includes('requirements.txt') || 
           path.includes('pyproject.toml') || path.includes('.env') || path.includes('dockerfile');
  });
  
  const documentationFiles = files.filter(file => {
    const path = file.path.toLowerCase();
    return path.endsWith('.md') || path.includes('docs/') || path.includes('documentation/');
  });
  
  const testFiles = files.filter(file => {
    const path = file.path.toLowerCase();
    return path.includes('test') || path.includes('spec') || path.includes('__tests__/');
  });
  
  // Create version info
  const version: RepoVersion = {
    pushedAt: repoData.pushed_at,
    updatedAt: repoData.updated_at,
    defaultBranch: repoData.default_branch,
    fileTreeSha: 'current' // This would be set by the calling function
  };
  
  return {
    metadata: repoData,
    fileTree: files,
    version,
    analyzedAt: new Date().toISOString(),
    fileCount: files.filter(f => f.type === 'blob').length,
    languages,
    framework,
    subsystems,
    mainFiles,
    configFiles,
    documentationFiles,
    testFiles
  };
}