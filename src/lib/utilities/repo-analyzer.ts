import type { RepoData, GitHubFile, RepoVersion } from '$types/repository';
import type {
  Framework,
  Subsystem,
  SubsystemReference,
  SubsystemPattern,
  AnalysisResult,
  FileInterface,
  CitationLink
} from '$types/analysis';

/**
 * Detects the framework used in a repository based on file patterns and dependencies
 */
export function detectFramework(repoData: RepoData, files: GitHubFile[]): Framework {
  const filePaths = files.map(f => f.path.toLowerCase());

  // Check for Multi-framework projects first (before React detection)
  if (filePaths.some(path => path.startsWith('examples/')) &&
      filePaths.some(path => path.includes('package.json')) &&
      filePaths.some(path => path.includes('readme.md') || path.includes('README.md'))) {
    // Look for multiple framework indicators in examples directory
    const examplePaths = filePaths.filter(path => path.startsWith('examples/'));
    const frameworkIndicators = [
      'angular', 'react', 'vue', 'ember', 'backbone', 'knockout', 
      'polymer', 'svelte', 'mithril', 'riot', 'aurelia'
    ];
    const foundFrameworks = frameworkIndicators.filter(framework =>
      examplePaths.some(path => path.includes(framework))
    );
    if (foundFrameworks.length >= 2) {
      return 'multi-framework';
    }
  }

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

  // Check for Svelte/SvelteKit
  if (filePaths.some(path => path.includes('svelte.config.js') || 
                            path.includes('svelte.config.ts') ||
                            path.includes('svelte.config.mjs'))) {
    return 'svelte';
  }
  
  // Also check for .svelte files and src/routes structure (SvelteKit pattern)
  if (filePaths.some(path => path.endsWith('.svelte')) &&
      filePaths.some(path => path.startsWith('src/routes/'))) {
    return 'svelte';
  }
  
  // Just having .svelte files also indicates Svelte
  if (filePaths.some(path => path.endsWith('.svelte'))) {
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


  // Check for Python CLI tools
  if (filePaths.some(path => path.includes('pyproject.toml')) &&
      filePaths.some(path => path.endsWith('.py'))) {
    
    // Look for CLI-specific patterns
    const hasCliPatterns = filePaths.some(path => 
      path.includes('cli') || path.includes('command') || path.includes('main.py') ||
      path.includes('__main__.py') || path.includes('console_scripts') || path.includes('bin/')
    );
    
    // Look for Poetry or modern Python packaging
    const hasModernPython = filePaths.some(path => 
      path.includes('poetry.lock') || path.includes('setup.py') || 
      path.includes('setup.cfg') || path.includes('pyproject.toml')
    );

    // Check if it's more of a library structure
    const hasLibStructure = filePaths.some(path => path.startsWith('src/')) &&
                           filePaths.some(path => path.includes('tests/')) &&
                           !filePaths.some(path => path.includes('app.py') || path.includes('main.py'));

    if (hasCliPatterns && hasModernPython) {
      return 'python-cli';
    } else if (hasLibStructure && hasModernPython) {
      return 'python-lib';
    }
  }

  // General Python library/package detection
  if (filePaths.some(path => path.includes('setup.py') || path.includes('pyproject.toml')) &&
      filePaths.some(path => path.endsWith('.py')) &&
      !filePaths.some(path => path.includes('app.py') || path.includes('main.py') || path.includes('wsgi.py'))) {
    // This looks like a Python library rather than a web framework
    return 'python-lib';
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
    },
    {
      name: 'Configuration',
      description: 'Configuration files and settings',
      patterns: ['config/', 'src/config/', '.github/', '.vscode/', 'public/'],
      extensions: ['.js', '.ts', '.json', '.yaml', '.yml', '.toml', '.env', '.md'],
      priority: 7
    },
    {
      name: 'Documentation',
      description: 'Project documentation and guides',
      patterns: ['docs/', 'documentation/', 'README', 'CHANGELOG', 'CONTRIBUTING'],
      extensions: ['.md', '.mdx', '.txt', '.rst'],
      priority: 8
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
    },
    {
      name: 'Configuration',
      description: 'Configuration files and settings',
      patterns: ['config/', 'src/config/', '.github/', '.vscode/', 'public/'],
      extensions: ['.js', '.ts', '.json', '.yaml', '.yml', '.toml', '.env', '.md'],
      priority: 7
    },
    {
      name: 'Documentation',
      description: 'Project documentation and guides',
      patterns: ['docs/', 'documentation/', 'README', 'CHANGELOG', 'CONTRIBUTING'],
      extensions: ['.md', '.mdx', '.txt', '.rst'],
      priority: 8
    }
  ],
  svelte: [
    {
      name: 'Routes',
      description: 'SvelteKit routes and pages',
      patterns: ['src/routes/', 'routes/'],
      extensions: ['.svelte', '.js', '.ts', '.server.js', '.server.ts'],
      priority: 1
    },
    {
      name: 'Components',
      description: 'Svelte components',
      patterns: ['src/lib/components/', 'src/components/', 'components/'],
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
      name: 'Server',
      description: 'Server-side logic and utilities',
      patterns: ['src/lib/server/', 'src/server/'],
      extensions: ['.js', '.ts'],
      priority: 4
    },
    {
      name: 'Services',
      description: 'External services and integrations',
      patterns: ['src/lib/firebase/', 'src/lib/services/', 'src/services/'],
      extensions: ['.js', '.ts'],
      priority: 5
    },
    {
      name: 'Models',
      description: 'Data models and types',
      patterns: ['src/lib/models/', 'src/models/'],
      extensions: ['.js', '.ts'],
      priority: 6
    },
    {
      name: 'Utils',
      description: 'Utility functions and helpers',
      patterns: ['src/lib/utils/', 'src/utils/', 'utils/', 'src/lib/'],
      extensions: ['.js', '.ts'],
      priority: 7
    },
    {
      name: 'Configuration',
      description: 'Configuration files and settings',
      patterns: ['config/', 'src/config/', '.github/', '.vscode/', 'static/', 'public/'],
      extensions: ['.js', '.ts', '.json', '.yaml', '.yml', '.toml', '.env', '.md'],
      priority: 8
    },
    {
      name: 'Documentation',
      description: 'Project documentation and guides',
      patterns: ['docs/', 'documentation/', 'README', 'CHANGELOG', 'CONTRIBUTING'],
      extensions: ['.md', '.mdx', '.txt', '.rst'],
      priority: 9
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
      name: 'Configuration',
      description: 'Configuration files and settings',
      patterns: ['config/', 'app/config/', 'src/config/', '.github/', 'instance/', 'migrations/'],
      extensions: ['.py', '.json', '.yaml', '.yml', '.toml', '.env', '.cfg', '.ini'],
      priority: 5
    },
    {
      name: 'Auth',
      description: 'Authentication and authorization',
      patterns: ['auth/', 'app/auth/', 'src/auth/'],
      extensions: ['.py'],
      priority: 6
    },
    {
      name: 'Documentation',
      description: 'Project documentation and guides',
      patterns: ['docs/', 'documentation/', 'README', 'CHANGELOG', 'CONTRIBUTING'],
      extensions: ['.md', '.rst', '.txt'],
      priority: 7
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
      name: 'Configuration',
      description: 'Configuration files and settings',
      patterns: ['config/', 'app/config/', 'src/config/', '.github/', 'docker/', 'deployment/'],
      extensions: ['.py', '.json', '.yaml', '.yml', '.toml', '.env', '.cfg', '.ini'],
      priority: 5
    },
    {
      name: 'Auth',
      description: 'Authentication and authorization',
      patterns: ['auth/', 'app/auth/', 'src/auth/'],
      extensions: ['.py'],
      priority: 6
    },
    {
      name: 'Documentation',
      description: 'Project documentation and guides',
      patterns: ['docs/', 'documentation/', 'README', 'CHANGELOG', 'CONTRIBUTING'],
      extensions: ['.md', '.rst', '.txt'],
      priority: 7
    }
  ],
  'python-cli': [
    {
      name: 'CLI/Commands',
      description: 'Command-line interface and command implementations',
      patterns: ['src/', 'cli/', 'commands/', 'bin/'],
      extensions: ['.py'],
      priority: 1
    },
    {
      name: 'Core/Library',
      description: 'Core library functionality and modules',
      patterns: ['src/', 'lib/', 'core/'],
      extensions: ['.py'],
      priority: 2
    },
    {
      name: 'Configuration',
      description: 'Configuration files and project setup',
      patterns: ['config/', 'settings/', '.'],
      extensions: ['.toml', '.cfg', '.ini', '.yaml', '.yml', '.json'],
      priority: 3
    },
    {
      name: 'Tests',
      description: 'Test files and test utilities',
      patterns: ['tests/', 'test/', 'test_data/'],
      extensions: ['.py'],
      priority: 4
    },
    {
      name: 'Documentation',
      description: 'Project documentation and guides',
      patterns: ['docs/', 'documentation/', 'README', 'CHANGELOG', 'CONTRIBUTING'],
      extensions: ['.md', '.rst', '.txt'],
      priority: 5
    },
    {
      name: 'Assets/Resources',
      description: 'Static assets and resource files',
      patterns: ['assets/', 'resources/', 'static/', 'imgs/', 'media/'],
      extensions: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.css', '.js', '.html'],
      priority: 6
    }
  ],
  'python-lib': [
    {
      name: 'Source/Library',
      description: 'Main library source code and modules',
      patterns: ['src/', 'lib/', 'package_name/'],
      extensions: ['.py'],
      priority: 1
    },
    {
      name: 'API/Interface',
      description: 'Public API and interface definitions',
      patterns: ['src/', 'api/', 'interface/'],
      extensions: ['.py'],
      priority: 2
    },
    {
      name: 'Tests',
      description: 'Test files and test utilities',
      patterns: ['tests/', 'test/', 'test_data/'],
      extensions: ['.py'],
      priority: 3
    },
    {
      name: 'Examples',
      description: 'Usage examples and sample code',
      patterns: ['examples/', 'samples/', 'demo/'],
      extensions: ['.py', '.ipynb', '.md'],
      priority: 4
    },
    {
      name: 'Configuration',
      description: 'Configuration files and project setup',
      patterns: ['config/', 'settings/', '.'],
      extensions: ['.toml', '.cfg', '.ini', '.yaml', '.yml', '.json', '.py'],
      priority: 5
    },
    {
      name: 'Documentation',
      description: 'Project documentation and guides',
      patterns: ['docs/', 'documentation/', 'README', 'CHANGELOG', 'CONTRIBUTING'],
      extensions: ['.md', '.rst', '.txt'],
      priority: 6
    }
  ],
  'multi-framework': [
    {
      name: 'Examples/Implementations',
      description: 'Framework-specific implementations and examples',
      patterns: ['examples/', 'implementations/', 'samples/'],
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte', '.html', '.css'],
      priority: 1
    },
    {
      name: 'Shared/Common',
      description: 'Shared resources and common files',
      patterns: ['shared/', 'common/', 'assets/', 'css/', 'js/'],
      extensions: ['.js', '.css', '.html', '.json', '.md'],
      priority: 2
    },
    {
      name: 'Testing',
      description: 'Testing infrastructure and test files',
      patterns: ['tests/', 'test/', 'cypress/', 'e2e/'],
      extensions: ['.js', '.ts', '.json', '.config.js'],
      priority: 3
    },
    {
      name: 'Tooling/Build',
      description: 'Build tools and development utilities',
      patterns: ['tools/', 'tooling/', 'build/', 'tasks/', 'scripts/'],
      extensions: ['.js', '.json', '.yml', '.yaml'],
      priority: 4
    },
    {
      name: 'Site/Assets',
      description: 'Website assets and static resources',
      patterns: ['site-assets/', 'static/', 'public/', 'media/'],
      extensions: ['.css', '.js', '.html', '.png', '.jpg', '.svg', '.ico'],
      priority: 5
    },
    {
      name: 'Documentation',
      description: 'Project documentation and guides',
      patterns: ['docs/', 'documentation/', 'README', 'CHANGELOG', 'CONTRIBUTING'],
      extensions: ['.md', '.html', '.txt'],
      priority: 6
    },
    {
      name: 'Configuration',
      description: 'Configuration files and project setup',
      patterns: ['config/', '.'],
      extensions: ['.json', '.js', '.yml', '.yaml', '.toml', '.config.js'],
      priority: 7
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
      const pathMatches = pattern.patterns.some(p => {
        const normalizedPath = file.path.toLowerCase();
        const normalizedPattern = p.toLowerCase();
        // Match if the file path starts with or contains the pattern
        return normalizedPath.startsWith(normalizedPattern) || 
               normalizedPath.includes('/' + normalizedPattern);
      });

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

  // Create fileTree object with path as key
  const fileTree: Record<string, GitHubFile> = {};
  files.forEach(file => {
    fileTree[file.path] = file;
  });

  // Categorize files into subsystems (returns Subsystem[], we'll convert to SubsystemReference[])
  const subsystemsOld = categorizeFiles(files, framework);
  const subsystems = subsystemsOld.map(subsystem => ({
    name: subsystem.name,
    description: subsystem.description,
    files: subsystem.files.map(file => file.path), // Convert to array of keys
    pattern: subsystem.pattern
  }));

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

  // Categorize special files - return array of file paths instead of file objects
  const mainFiles = files
    .filter(file =>
      ['readme.md', 'index.js', 'index.ts', 'main.py', 'app.py', 'index.html', 'package.json'].includes(file.path.toLowerCase())
    )
    .map(file => file.path);

  const configFiles = files
    .filter(file => {
      const path = file.path.toLowerCase();
      return path.includes('config') || path.endsWith('.config.js') || path.endsWith('.config.ts') ||
             path.includes('package.json') || path.includes('requirements.txt') ||
             path.includes('pyproject.toml') || path.includes('.env') || path.includes('dockerfile');
    })
    .map(file => file.path);

  const documentationFiles = files
    .filter(file => {
      const path = file.path.toLowerCase();
      return path.endsWith('.md') || path.includes('docs/') || path.includes('documentation/');
    })
    .map(file => file.path);

  const testFiles = files
    .filter(file => {
      const path = file.path.toLowerCase();
      return path.includes('test') || path.includes('spec') || path.includes('__tests__/');
    })
    .map(file => file.path);

  // Create version info
  const version: RepoVersion = {
    pushedAt: repoData.pushed_at,
    updatedAt: repoData.updated_at,
    defaultBranch: repoData.default_branch,
    fileTreeSha: 'current' // This would be set by the calling function
  };

  return {
    metadata: repoData,
    fileTree,
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

/**
 * Helper function to get files from subsystem using fileTree object
 */
export function getSubsystemFiles(subsystem: SubsystemReference, fileTree: Record<string, GitHubFile>): GitHubFile[] {
  return subsystem.files.map(filePath => fileTree[filePath]).filter(Boolean);
}

/**
 * Helper function to get files by paths from fileTree object
 */
export function getFilesByPaths(filePaths: string[], fileTree: Record<string, GitHubFile>): GitHubFile[] {
  return filePaths.map(filePath => fileTree[filePath]).filter(Boolean);
}

/**
 * Extracts key interfaces and exports from files using regex patterns
 */
export function extractKeyInterfaces(files: GitHubFile[] | (GitHubFile & { content?: string })[]): FileInterface[] {
  const interfaces: FileInterface[] = [];

  // Patterns for different file types
  const patterns = {
    typescript: {
      function: /export\s+(async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)/g,
      class: /export\s+class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
      interface: /export\s+interface\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
      type: /export\s+type\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
      const: /export\s+const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g
    },
    javascript: {
      function: /export\s+(async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)/g,
      class: /export\s+class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
      const: /export\s+const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g
    },
    python: {
      function: /def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g,
      class: /class\s+([a-zA-Z_][a-zA-Z0-9_]*)/g
    },
    svelte: {
      component: /<script[^>]*>([\s\S]*?)<\/script>/g
    }
  };

  for (const file of files.slice(0, 20)) { // Limit to first 20 files for performance
    // Type guard to check if file has content property
    const fileWithContent = file as GitHubFile & { content?: string };
    if (!fileWithContent.content || file.type !== 'blob') continue;

    const extension = file.path.split('.').pop()?.toLowerCase();
    let filePatterns: any = {};

    switch (extension) {
      case 'ts':
      case 'tsx':
        filePatterns = patterns.typescript;
        break;
      case 'js':
      case 'jsx':
        filePatterns = patterns.javascript;
        break;
      case 'py':
        filePatterns = patterns.python;
        break;
      case 'svelte':
        filePatterns = patterns.svelte;
        break;
      default:
        continue;
    }

    const content = fileWithContent.content;

    for (const [type, pattern] of Object.entries(filePatterns)) {
      const regex = pattern as RegExp;
      let match;

      while ((match = regex.exec(content)) !== null) {
        const name = match[2] || match[1]; // Different capture groups for different patterns
        if (!name) continue;

        // Find line number
        const matchIndex = match.index || 0;
        const lineNumber = content.substring(0, matchIndex).split('\n').length;

        interfaces.push({
          filePath: file.path,
          type: type as any,
          name,
          signature: match[0],
          visibility: 'public', // Default to public for exports
          lineNumber
        });
      }
    }
  }

  return interfaces;
}

/**
 * Generates GitHub citation links for files and line references
 */
export function generateInlineCitations(
  filePath: string,
  repoOwner: string,
  repoName: string,
  lineNumber?: number,
  context?: string
): CitationLink {
  const baseUrl = `https://github.com/${repoOwner}/${repoName}/blob/main/${filePath}`;
  const urlWithLine = lineNumber ? `${baseUrl}#L${lineNumber}` : baseUrl;

  const displayText = lineNumber
    ? `${filePath}:${lineNumber}`
    : filePath;

  return {
    type: lineNumber ? 'line' : 'file',
    url: urlWithLine,
    displayText,
    filePath,
    lineNumber,
    context
  };
}