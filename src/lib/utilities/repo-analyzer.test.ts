import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectFramework,
  categorizeFiles,
  analyzeRepo,
  extractKeyInterfaces,
  generateInlineCitations,
  getSubsystemFiles,
  getFilesByPaths
} from './repo-analyzer';
import type { GitHubFile, RepoData } from '$types/repository';
import type { Framework, SubsystemReference } from '$types/analysis';

describe('repo-analyzer', () => {
  let mockRepoData: RepoData;
  let mockFiles: GitHubFile[];

  beforeEach(() => {
    mockRepoData = {
      id: 123456,
      name: 'test-repo',
      full_name: 'testuser/test-repo',
      owner: {
        id: 1,
        login: 'testuser',
        avatar_url: 'https://github.com/avatar.jpg',
        html_url: 'https://github.com/testuser'
      },
      private: false,
      html_url: 'https://github.com/testuser/test-repo',
      description: 'A test repository',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      pushed_at: '2024-01-02T00:00:00Z',
      stargazers_count: 10,
      forks_count: 5,
      language: 'TypeScript',
      default_branch: 'main',
      topics: ['test', 'repo'],
      license: {
        key: 'mit',
        name: 'MIT License',
        url: 'https://opensource.org/licenses/MIT'
      }
    };

    mockFiles = [];
  });

  describe('detectFramework', () => {
    it('should detect Next.js from next.config.js', () => {
      mockFiles = [
        { path: 'next.config.js', type: 'blob', size: 100, url: 'test', html_url: 'test' },
        { path: 'package.json', type: 'blob', size: 200, url: 'test', html_url: 'test' }
      ];

      const framework = detectFramework(mockRepoData, mockFiles);
      expect(framework).toBe('nextjs');
    });

    it('should detect Next.js from pages directory structure', () => {
      mockFiles = [
        { path: 'pages/index.tsx', type: 'blob', size: 100, url: 'test', html_url: 'test' },
        { path: 'package.json', type: 'blob', size: 200, url: 'test', html_url: 'test' }
      ];

      const framework = detectFramework(mockRepoData, mockFiles);
      expect(framework).toBe('nextjs');
    });

    it('should detect Next.js from app directory structure', () => {
      mockFiles = [
        { path: 'app/page.tsx', type: 'blob', size: 100, url: 'test', html_url: 'test' },
        { path: 'package.json', type: 'blob', size: 200, url: 'test', html_url: 'test' }
      ];

      const framework = detectFramework(mockRepoData, mockFiles);
      expect(framework).toBe('nextjs');
    });

    it('should detect React from JSX/TSX files', () => {
      mockFiles = [
        { path: 'src/App.jsx', type: 'blob', size: 100, url: 'test', html_url: 'test' },
        { path: 'src/components/Button.tsx', type: 'blob', size: 150, url: 'test', html_url: 'test' },
        { path: 'package.json', type: 'blob', size: 200, url: 'test', html_url: 'test' }
      ];

      const framework = detectFramework(mockRepoData, mockFiles);
      expect(framework).toBe('react');
    });

    it('should detect Svelte from svelte.config.js', () => {
      mockFiles = [
        { path: 'svelte.config.js', type: 'blob', size: 100, url: 'test', html_url: 'test' }
      ];

      const framework = detectFramework(mockRepoData, mockFiles);
      expect(framework).toBe('svelte');
    });

    it('should detect Svelte from .svelte files and src/routes structure', () => {
      mockFiles = [
        { path: 'src/routes/+page.svelte', type: 'blob', size: 100, url: 'test', html_url: 'test' },
        { path: 'src/lib/components/Button.svelte', type: 'blob', size: 150, url: 'test', html_url: 'test' }
      ];

      const framework = detectFramework(mockRepoData, mockFiles);
      expect(framework).toBe('svelte');
    });

    it('should detect Flask from app.py and Python files', () => {
      mockFiles = [
        { path: 'app.py', type: 'blob', size: 100, url: 'test', html_url: 'test' },
        { path: 'requirements.txt', type: 'blob', size: 50, url: 'test', html_url: 'test' },
        { path: 'models.py', type: 'blob', size: 200, url: 'test', html_url: 'test' }
      ];

      const framework = detectFramework(mockRepoData, mockFiles);
      expect(framework).toBe('flask');
    });

    it('should detect FastAPI from main.py', () => {
      mockFiles = [
        { path: 'main.py', type: 'blob', size: 100, url: 'test', html_url: 'test' },
        { path: 'requirements.txt', type: 'blob', size: 50, url: 'test', html_url: 'test' }
      ];

      const framework = detectFramework(mockRepoData, mockFiles);
      expect(framework).toBe('fastapi');
    });

    it('should return unknown for unrecognized frameworks', () => {
      mockFiles = [
        { path: 'README.md', type: 'blob', size: 100, url: 'test', html_url: 'test' },
        { path: 'index.html', type: 'blob', size: 200, url: 'test', html_url: 'test' }
      ];

      const framework = detectFramework(mockRepoData, mockFiles);
      expect(framework).toBe('unknown');
    });

    it('should prioritize Next.js over React detection', () => {
      mockFiles = [
        { path: 'next.config.js', type: 'blob', size: 100, url: 'test', html_url: 'test' },
        { path: 'src/App.jsx', type: 'blob', size: 150, url: 'test', html_url: 'test' },
        { path: 'package.json', type: 'blob', size: 200, url: 'test', html_url: 'test' }
      ];

      const framework = detectFramework(mockRepoData, mockFiles);
      expect(framework).toBe('nextjs');
    });

    it('should detect multi-framework projects like TodoMVC', () => {
      mockFiles = [
        { path: 'examples/angular/index.html', type: 'blob', size: 100, url: 'test', html_url: 'test' },
        { path: 'examples/react/app.jsx', type: 'blob', size: 150, url: 'test', html_url: 'test' },
        { path: 'examples/vue/app.js', type: 'blob', size: 120, url: 'test', html_url: 'test' },
        { path: 'examples/ember/app.js', type: 'blob', size: 110, url: 'test', html_url: 'test' },
        { path: 'package.json', type: 'blob', size: 200, url: 'test', html_url: 'test' },
        { path: 'README.md', type: 'blob', size: 500, url: 'test', html_url: 'test' }
      ];

      const framework = detectFramework(mockRepoData, mockFiles);
      expect(framework).toBe('multi-framework');
    });

    it('should detect Python CLI tools', () => {
      mockFiles = [
        { path: 'pyproject.toml', type: 'blob', size: 300, url: 'test', html_url: 'test' },
        { path: 'poetry.lock', type: 'blob', size: 1000, url: 'test', html_url: 'test' },
        { path: 'src/rich_cli/__main__.py', type: 'blob', size: 200, url: 'test', html_url: 'test' },
        { path: 'src/rich_cli/cli.py', type: 'blob', size: 400, url: 'test', html_url: 'test' },
        { path: 'tests/test_cli.py', type: 'blob', size: 150, url: 'test', html_url: 'test' }
      ];

      const framework = detectFramework(mockRepoData, mockFiles);
      expect(framework).toBe('python-cli');
    });

    it('should detect Python libraries with src structure', () => {
      mockFiles = [
        { path: 'pyproject.toml', type: 'blob', size: 300, url: 'test', html_url: 'test' },
        { path: 'poetry.lock', type: 'blob', size: 1000, url: 'test', html_url: 'test' },
        { path: 'src/browser_use/__init__.py', type: 'blob', size: 100, url: 'test', html_url: 'test' },
        { path: 'src/browser_use/agent.py', type: 'blob', size: 500, url: 'test', html_url: 'test' },
        { path: 'tests/test_agent.py', type: 'blob', size: 200, url: 'test', html_url: 'test' },
        { path: 'examples/simple.py', type: 'blob', size: 150, url: 'test', html_url: 'test' }
      ];

      const framework = detectFramework(mockRepoData, mockFiles);
      expect(framework).toBe('python-lib');
    });

    it('should detect Python libraries with setup.py', () => {
      mockFiles = [
        { path: 'setup.py', type: 'blob', size: 400, url: 'test', html_url: 'test' },
        { path: 'mypackage/__init__.py', type: 'blob', size: 50, url: 'test', html_url: 'test' },
        { path: 'mypackage/core.py', type: 'blob', size: 300, url: 'test', html_url: 'test' },
        { path: 'tests/test_core.py', type: 'blob', size: 200, url: 'test', html_url: 'test' }
      ];

      const framework = detectFramework(mockRepoData, mockFiles);
      expect(framework).toBe('python-lib');
    });

    it('should not confuse Flask/FastAPI with Python libraries', () => {
      mockFiles = [
        { path: 'app.py', type: 'blob', size: 200, url: 'test', html_url: 'test' },
        { path: 'requirements.txt', type: 'blob', size: 100, url: 'test', html_url: 'test' },
        { path: 'models.py', type: 'blob', size: 150, url: 'test', html_url: 'test' }
      ];

      const framework = detectFramework(mockRepoData, mockFiles);
      expect(framework).toBe('flask');
    });

    it('should require multiple frameworks for multi-framework detection', () => {
      mockFiles = [
        { path: 'examples/react/app.js', type: 'blob', size: 150, url: 'test', html_url: 'test' }, // Changed .jsx to .js
        { path: 'package.json', type: 'blob', size: 200, url: 'test', html_url: 'test' },
        { path: 'README.md', type: 'blob', size: 500, url: 'test', html_url: 'test' }
      ];

      const framework = detectFramework(mockRepoData, mockFiles);
      expect(framework).toBe('unknown'); // Only one framework found, no JSX/TSX files
    });
  });

  describe('categorizeFiles', () => {
    it('should categorize React files correctly', () => {
      const framework: Framework = 'react';
      mockFiles = [
        { path: 'src/components/Button.tsx', type: 'blob', size: 100, url: 'test', html_url: 'test' },
        { path: 'src/components/Modal.jsx', type: 'blob', size: 150, url: 'test', html_url: 'test' },
        { path: 'src/pages/Home.tsx', type: 'blob', size: 200, url: 'test', html_url: 'test' },
        { path: 'src/hooks/useAuth.ts', type: 'blob', size: 120, url: 'test', html_url: 'test' },
        { path: 'src/services/api.ts', type: 'blob', size: 180, url: 'test', html_url: 'test' },
        { path: 'src/utils/helpers.ts', type: 'blob', size: 90, url: 'test', html_url: 'test' },
        { path: 'README.md', type: 'blob', size: 50, url: 'test', html_url: 'test' }
      ];

      const subsystems = categorizeFiles(mockFiles, framework);

      expect(subsystems).toHaveLength(6); // Components, Pages/Routes, Hooks, Services/API, Utils, Documentation
      
      const components = subsystems.find(s => s.name === 'Components');
      expect(components).toBeDefined();
      expect(components?.files).toHaveLength(2);
      expect(components?.files.map(f => f.path)).toContain('src/components/Button.tsx');
      expect(components?.files.map(f => f.path)).toContain('src/components/Modal.jsx');

      const pages = subsystems.find(s => s.name === 'Pages/Routes');
      expect(pages).toBeDefined();
      expect(pages?.files).toHaveLength(1);
      expect(pages?.files[0].path).toBe('src/pages/Home.tsx');

      const hooks = subsystems.find(s => s.name === 'Hooks');
      expect(hooks).toBeDefined();
      expect(hooks?.files).toHaveLength(1);
      expect(hooks?.files[0].path).toBe('src/hooks/useAuth.ts');

      const documentation = subsystems.find(s => s.name === 'Documentation');
      expect(documentation).toBeDefined();
      expect(documentation?.files).toHaveLength(1);
      expect(documentation?.files[0].path).toBe('README.md');
    });

    it('should categorize Svelte files correctly', () => {
      const framework: Framework = 'svelte';
      mockFiles = [
        { path: 'src/routes/+page.svelte', type: 'blob', size: 200, url: 'test', html_url: 'test' },
        { path: 'src/routes/about/+page.svelte', type: 'blob', size: 150, url: 'test', html_url: 'test' },
        { path: 'src/lib/components/Button.svelte', type: 'blob', size: 100, url: 'test', html_url: 'test' },
        { path: 'src/lib/stores/auth.ts', type: 'blob', size: 120, url: 'test', html_url: 'test' },
        { path: 'src/lib/services/api.ts', type: 'blob', size: 180, url: 'test', html_url: 'test' },
        { path: 'src/lib/utils/helpers.ts', type: 'blob', size: 90, url: 'test', html_url: 'test' }
      ];

      const subsystems = categorizeFiles(mockFiles, framework);

      const routes = subsystems.find(s => s.name === 'Routes');
      expect(routes).toBeDefined();
      expect(routes?.files).toHaveLength(2);

      const components = subsystems.find(s => s.name === 'Components');
      expect(components).toBeDefined();
      expect(components?.files).toHaveLength(1);
      expect(components?.files[0].path).toBe('src/lib/components/Button.svelte');

      const stores = subsystems.find(s => s.name === 'Stores');
      expect(stores).toBeDefined();
      expect(stores?.files).toHaveLength(1);
      expect(stores?.files[0].path).toBe('src/lib/stores/auth.ts');
    });

    it('should handle files with no matching patterns in Other category', () => {
      const framework: Framework = 'react';
      mockFiles = [
        { path: 'src/components/Button.tsx', type: 'blob', size: 100, url: 'test', html_url: 'test' },
        { path: 'random-file.xyz', type: 'blob', size: 50, url: 'test', html_url: 'test' },
        { path: 'config/weird.conf', type: 'blob', size: 75, url: 'test', html_url: 'test' }
      ];

      const subsystems = categorizeFiles(mockFiles, framework);

      const other = subsystems.find(s => s.name === 'Other');
      expect(other).toBeDefined();
      expect(other?.files).toHaveLength(2);
      expect(other?.files.map(f => f.path)).toContain('random-file.xyz');
      expect(other?.files.map(f => f.path)).toContain('config/weird.conf');
    });

    it('should not duplicate files across subsystems', () => {
      const framework: Framework = 'react';
      mockFiles = [
        { path: 'src/components/Button.tsx', type: 'blob', size: 100, url: 'test', html_url: 'test' },
        { path: 'src/lib/Button.tsx', type: 'blob', size: 100, url: 'test', html_url: 'test' }
      ];

      const subsystems = categorizeFiles(mockFiles, framework);

      // Count total files across all subsystems
      const totalFiles = subsystems.reduce((sum, subsystem) => sum + subsystem.files.length, 0);
      expect(totalFiles).toBe(2); // Should equal original file count
    });

    it('should handle empty file list', () => {
      const framework: Framework = 'react';
      mockFiles = [];

      const subsystems = categorizeFiles(mockFiles, framework);

      expect(subsystems).toHaveLength(0);
    });

    it('should only include blob type files', () => {
      const framework: Framework = 'react';
      mockFiles = [
        { path: 'src/components/Button.tsx', type: 'blob', size: 100, url: 'test', html_url: 'test' },
        { path: 'src/components', type: 'tree', url: 'test', html_url: 'test' } // directory
      ];

      const subsystems = categorizeFiles(mockFiles, framework);

      const components = subsystems.find(s => s.name === 'Components');
      expect(components).toBeDefined();
      expect(components?.files).toHaveLength(1);
      expect(components?.files[0].path).toBe('src/components/Button.tsx');
    });

    it('should categorize multi-framework files correctly', () => {
      const framework: Framework = 'multi-framework';
      mockFiles = [
        { path: 'examples/angular/app.js', type: 'blob', size: 150, url: 'test', html_url: 'test' },
        { path: 'examples/react/app.jsx', type: 'blob', size: 200, url: 'test', html_url: 'test' },
        { path: 'examples/vue/app.vue', type: 'blob', size: 180, url: 'test', html_url: 'test' },
        { path: 'shared/css/base.css', type: 'blob', size: 100, url: 'test', html_url: 'test' },
        { path: 'tests/cypress/integration/test.js', type: 'blob', size: 300, url: 'test', html_url: 'test' },
        { path: 'site-assets/logo.png', type: 'blob', size: 5000, url: 'test', html_url: 'test' },
        { path: 'tooling/build.js', type: 'blob', size: 250, url: 'test', html_url: 'test' },
        { path: 'README.md', type: 'blob', size: 1000, url: 'test', html_url: 'test' }
      ];

      const subsystems = categorizeFiles(mockFiles, framework);

      expect(subsystems.length).toBeGreaterThanOrEqual(5); // At least: Examples, Shared, Testing, Site/Assets, Tooling/Build, Documentation

      const examples = subsystems.find(s => s.name === 'Examples/Implementations');
      expect(examples).toBeDefined();
      expect(examples?.files).toHaveLength(3);
      expect(examples?.files.map(f => f.path)).toContain('examples/angular/app.js');
      expect(examples?.files.map(f => f.path)).toContain('examples/react/app.jsx');
      expect(examples?.files.map(f => f.path)).toContain('examples/vue/app.vue');

      const shared = subsystems.find(s => s.name === 'Shared/Common');
      expect(shared).toBeDefined();
      expect(shared?.files).toHaveLength(1);
      expect(shared?.files[0].path).toBe('shared/css/base.css');

      const testing = subsystems.find(s => s.name === 'Testing');
      expect(testing).toBeDefined();
      expect(testing?.files).toHaveLength(1);
      expect(testing?.files[0].path).toBe('tests/cypress/integration/test.js');
    });

    it('should categorize Python CLI files correctly', () => {
      const framework: Framework = 'python-cli';
      mockFiles = [
        { path: 'src/rich_cli/__main__.py', type: 'blob', size: 200, url: 'test', html_url: 'test' },
        { path: 'src/rich_cli/cli.py', type: 'blob', size: 400, url: 'test', html_url: 'test' },
        { path: 'src/rich_cli/core.py', type: 'blob', size: 300, url: 'test', html_url: 'test' },
        { path: 'tests/test_cli.py', type: 'blob', size: 150, url: 'test', html_url: 'test' },
        { path: 'pyproject.toml', type: 'blob', size: 250, url: 'test', html_url: 'test' },
        { path: 'README.md', type: 'blob', size: 500, url: 'test', html_url: 'test' },
        { path: 'imgs/screenshot.png', type: 'blob', size: 10000, url: 'test', html_url: 'test' }
      ];

      const subsystems = categorizeFiles(mockFiles, framework);

      expect(subsystems.length).toBeGreaterThanOrEqual(4); // At least: CLI/Commands, Tests, Documentation, Assets, and likely Configuration

      const cli = subsystems.find(s => s.name === 'CLI/Commands');
      expect(cli).toBeDefined();
      expect(cli?.files.length).toBeGreaterThan(0);
      expect(cli?.files.map(f => f.path)).toContain('src/rich_cli/__main__.py');
      expect(cli?.files.map(f => f.path)).toContain('src/rich_cli/cli.py');

      const tests = subsystems.find(s => s.name === 'Tests');
      expect(tests).toBeDefined();
      expect(tests?.files).toHaveLength(1);
      expect(tests?.files[0].path).toBe('tests/test_cli.py');

      // Configuration might be part of CLI/Commands or separate - check for the file in any subsystem
      const hasConfigFile = subsystems.some(s => 
        s.files.some(f => f.path === 'pyproject.toml')
      );
      expect(hasConfigFile).toBe(true);
    });

    it('should categorize Python library files correctly', () => {
      const framework: Framework = 'python-lib';
      mockFiles = [
        { path: 'src/browser_use/__init__.py', type: 'blob', size: 100, url: 'test', html_url: 'test' },
        { path: 'src/browser_use/agent.py', type: 'blob', size: 500, url: 'test', html_url: 'test' },
        { path: 'src/browser_use/api.py', type: 'blob', size: 300, url: 'test', html_url: 'test' },
        { path: 'tests/test_agent.py', type: 'blob', size: 200, url: 'test', html_url: 'test' },
        { path: 'examples/simple.py', type: 'blob', size: 150, url: 'test', html_url: 'test' },
        { path: 'examples/advanced.ipynb', type: 'blob', size: 2000, url: 'test', html_url: 'test' },
        { path: 'pyproject.toml', type: 'blob', size: 300, url: 'test', html_url: 'test' },
        { path: 'docs/usage.md', type: 'blob', size: 800, url: 'test', html_url: 'test' }
      ];

      const subsystems = categorizeFiles(mockFiles, framework);

      expect(subsystems).toHaveLength(5); // Source/Library, API/Interface, Tests, Examples, Configuration, Documentation

      const source = subsystems.find(s => s.name === 'Source/Library');
      expect(source).toBeDefined();
      expect(source?.files.length).toBeGreaterThan(0);
      expect(source?.files.map(f => f.path)).toContain('src/browser_use/__init__.py');
      expect(source?.files.map(f => f.path)).toContain('src/browser_use/agent.py');

      const examples = subsystems.find(s => s.name === 'Examples');
      expect(examples).toBeDefined();
      expect(examples?.files).toHaveLength(2);
      expect(examples?.files.map(f => f.path)).toContain('examples/simple.py');
      expect(examples?.files.map(f => f.path)).toContain('examples/advanced.ipynb');

      const tests = subsystems.find(s => s.name === 'Tests');
      expect(tests).toBeDefined();
      expect(tests?.files).toHaveLength(1);
      expect(tests?.files[0].path).toBe('tests/test_agent.py');
    });
  });

  describe('analyzeRepo', () => {
    it('should perform complete repository analysis', () => {
      mockFiles = [
        { path: 'src/components/Button.tsx', type: 'blob', size: 100, url: 'test', html_url: 'test' },
        { path: 'src/pages/Home.tsx', type: 'blob', size: 200, url: 'test', html_url: 'test' },
        { path: 'src/utils/helpers.js', type: 'blob', size: 150, url: 'test', html_url: 'test' },
        { path: 'package.json', type: 'blob', size: 300, url: 'test', html_url: 'test' },
        { path: 'README.md', type: 'blob', size: 250, url: 'test', html_url: 'test' },
        { path: 'src/__tests__/Button.test.tsx', type: 'blob', size: 180, url: 'test', html_url: 'test' }
      ];

      const result = analyzeRepo(mockRepoData, mockFiles);

      // Check basic properties
      expect(result.metadata).toEqual(mockRepoData);
      expect(result.framework).toBe('react');
      expect(result.fileCount).toBe(6);
      expect(result.analyzedAt).toBeTruthy();

      // Check file tree structure
      expect(result.fileTree).toHaveProperty('src/components/Button.tsx');
      expect(result.fileTree).toHaveProperty('package.json');

      // Check subsystems
      expect(result.subsystems).toBeTruthy();
      expect(result.subsystems.length).toBeGreaterThan(0);

      // Check language distribution
      expect(result.languages).toHaveProperty('TypeScript');
      expect(result.languages).toHaveProperty('JavaScript');
      expect(result.languages).toHaveProperty('JSON');
      expect(result.languages).toHaveProperty('Markdown');

      // Check special file categories
      expect(result.mainFiles).toContain('package.json');
      expect(result.configFiles).toContain('package.json');
      expect(result.documentationFiles).toContain('README.md');
      expect(result.testFiles).toContain('src/__tests__/Button.test.tsx');

      // Check version info
      expect(result.version).toBeDefined();
      expect(result.version.defaultBranch).toBe('main');
      expect(result.version.pushedAt).toBe(mockRepoData.pushed_at);
    });

    it('should handle repositories with no recognizable files', () => {
      mockFiles = [
        { path: 'unknown.xyz', type: 'blob', size: 100, url: 'test', html_url: 'test' },
        { path: 'data.bin', type: 'blob', size: 200, url: 'test', html_url: 'test' }
      ];

      const result = analyzeRepo(mockRepoData, mockFiles);

      expect(result.framework).toBe('unknown');
      expect(result.fileCount).toBe(2);
      expect(result.languages).toHaveProperty('XYZ');
      expect(result.languages).toHaveProperty('BIN');
    });

    it('should calculate language distribution by file size', () => {
      mockFiles = [
        { path: 'large.ts', type: 'blob', size: 1000, url: 'test', html_url: 'test' },
        { path: 'small.ts', type: 'blob', size: 100, url: 'test', html_url: 'test' },
        { path: 'medium.js', type: 'blob', size: 500, url: 'test', html_url: 'test' }
      ];

      const result = analyzeRepo(mockRepoData, mockFiles);

      expect(result.languages['TypeScript']).toBe(1100); // 1000 + 100
      expect(result.languages['JavaScript']).toBe(500);
    });
  });

  describe('extractKeyInterfaces', () => {
    it('should extract TypeScript functions, classes, and interfaces', () => {
      const filesWithContent = [
        {
          path: 'src/utils.ts',
          type: 'blob' as const,
          size: 200,
          url: 'test',
          html_url: 'test',
          content: `
export function calculateSum(a: number, b: number): number {
  return a + b;
}

export class DataProcessor {
  process(data: string): void {}
}

export interface User {
  id: number;
  name: string;
}

export type Status = 'active' | 'inactive';

export const API_URL = 'https://api.example.com';
          `
        }
      ];

      const interfaces = extractKeyInterfaces(filesWithContent);

      expect(interfaces).toHaveLength(5);

      const func = interfaces.find(i => i.name === 'calculateSum');
      expect(func).toBeDefined();
      expect(func?.type).toBe('function');
      expect(func?.filePath).toBe('src/utils.ts');
      expect(func?.signature).toContain('export function calculateSum');

      const cls = interfaces.find(i => i.name === 'DataProcessor');
      expect(cls).toBeDefined();
      expect(cls?.type).toBe('class');

      const iface = interfaces.find(i => i.name === 'User');
      expect(iface).toBeDefined();
      expect(iface?.type).toBe('interface');

      const type = interfaces.find(i => i.name === 'Status');
      expect(type).toBeDefined();
      expect(type?.type).toBe('type');

      const constant = interfaces.find(i => i.name === 'API_URL');
      expect(constant).toBeDefined();
      expect(constant?.type).toBe('const');
    });

    it('should extract Python functions and classes', () => {
      const filesWithContent = [
        {
          path: 'src/models.py',
          type: 'blob' as const,
          size: 200,
          url: 'test',
          html_url: 'test',
          content: `
def calculate_total(items):
    return sum(items)

class UserModel:
    def __init__(self, name):
        self.name = name

def process_data(data, callback=None):
    return callback(data) if callback else data
          `
        }
      ];

      const interfaces = extractKeyInterfaces(filesWithContent);

      expect(interfaces).toHaveLength(4);

      const func1 = interfaces.find(i => i.name === 'calculate_total');
      expect(func1).toBeDefined();
      expect(func1?.type).toBe('function');

      const cls = interfaces.find(i => i.name === 'UserModel');
      expect(cls).toBeDefined();
      expect(cls?.type).toBe('class');

      const func2 = interfaces.find(i => i.name === 'process_data');
      expect(func2).toBeDefined();
      expect(func2?.type).toBe('function');
    });

    it('should handle files without content', () => {
      const filesWithoutContent = [
        {
          path: 'src/empty.ts',
          type: 'blob' as const,
          size: 0,
          url: 'test',
          html_url: 'test'
        }
      ];

      const interfaces = extractKeyInterfaces(filesWithoutContent);
      expect(interfaces).toHaveLength(0);
    });

    it('should limit processing to first 20 files for performance', () => {
      const manyFiles = Array.from({ length: 25 }, (_, i) => ({
        path: `src/file${i}.ts`,
        type: 'blob' as const,
        size: 100,
        url: 'test',
        html_url: 'test',
        content: `export function func${i}() {}`
      }));

      const interfaces = extractKeyInterfaces(manyFiles);

      // Should only process first 20 files, so max 20 functions
      expect(interfaces.length).toBeLessThanOrEqual(20);
    });

    it('should calculate correct line numbers', () => {
      const filesWithContent = [
        {
          path: 'src/multiline.ts',
          type: 'blob' as const,
          size: 200,
          url: 'test',
          html_url: 'test',
          content: `// First line
// Second line
export function firstFunction(): void {}

// Some comment
export function secondFunction(): void {}
          `
        }
      ];

      const interfaces = extractKeyInterfaces(filesWithContent);

      const first = interfaces.find(i => i.name === 'firstFunction');
      expect(first?.lineNumber).toBe(3);

      const second = interfaces.find(i => i.name === 'secondFunction');
      expect(second?.lineNumber).toBe(6);
    });
  });

  describe('generateInlineCitations', () => {
    it('should generate file citation without line number', () => {
      const citation = generateInlineCitations(
        'src/components/Button.tsx',
        'testuser',
        'test-repo'
      );

      expect(citation.type).toBe('file');
      expect(citation.url).toBe('https://github.com/testuser/test-repo/blob/main/src/components/Button.tsx');
      expect(citation.displayText).toBe('src/components/Button.tsx');
      expect(citation.filePath).toBe('src/components/Button.tsx');
      expect(citation.lineNumber).toBeUndefined();
    });

    it('should generate line citation with line number', () => {
      const citation = generateInlineCitations(
        'src/utils/helpers.ts',
        'testuser',
        'test-repo',
        42,
        'function: calculateSum'
      );

      expect(citation.type).toBe('line');
      expect(citation.url).toBe('https://github.com/testuser/test-repo/blob/main/src/utils/helpers.ts#L42');
      expect(citation.displayText).toBe('src/utils/helpers.ts:42');
      expect(citation.filePath).toBe('src/utils/helpers.ts');
      expect(citation.lineNumber).toBe(42);
      expect(citation.context).toBe('function: calculateSum');
    });

    it('should handle special characters in file paths', () => {
      const citation = generateInlineCitations(
        'src/components/special-name with spaces.tsx',
        'testuser',
        'test-repo'
      );

      expect(citation.url).toBe('https://github.com/testuser/test-repo/blob/main/src/components/special-name with spaces.tsx');
      expect(citation.filePath).toBe('src/components/special-name with spaces.tsx');
    });
  });

  describe('getSubsystemFiles', () => {
    it('should retrieve files for a subsystem from fileTree', () => {
      const fileTree = {
        'src/components/Button.tsx': { path: 'src/components/Button.tsx', type: 'blob', size: 100, url: 'test', html_url: 'test' },
        'src/components/Modal.tsx': { path: 'src/components/Modal.tsx', type: 'blob', size: 150, url: 'test', html_url: 'test' },
        'src/pages/Home.tsx': { path: 'src/pages/Home.tsx', type: 'blob', size: 200, url: 'test', html_url: 'test' }
      } as Record<string, GitHubFile>;

      const subsystem: SubsystemReference = {
        name: 'Components',
        description: 'React components',
        files: ['src/components/Button.tsx', 'src/components/Modal.tsx'],
        pattern: 'src/components/'
      };

      const files = getSubsystemFiles(subsystem, fileTree);

      expect(files).toHaveLength(2);
      expect(files[0].path).toBe('src/components/Button.tsx');
      expect(files[1].path).toBe('src/components/Modal.tsx');
    });

    it('should filter out non-existent files', () => {
      const fileTree = {
        'src/components/Button.tsx': { path: 'src/components/Button.tsx', type: 'blob', size: 100, url: 'test', html_url: 'test' }
      } as Record<string, GitHubFile>;

      const subsystem: SubsystemReference = {
        name: 'Components',
        description: 'React components',
        files: ['src/components/Button.tsx', 'src/components/NonExistent.tsx'],
        pattern: 'src/components/'
      };

      const files = getSubsystemFiles(subsystem, fileTree);

      expect(files).toHaveLength(1);
      expect(files[0].path).toBe('src/components/Button.tsx');
    });
  });

  describe('getFilesByPaths', () => {
    it('should retrieve files by paths from fileTree', () => {
      const fileTree = {
        'README.md': { path: 'README.md', type: 'blob', size: 100, url: 'test', html_url: 'test' },
        'package.json': { path: 'package.json', type: 'blob', size: 200, url: 'test', html_url: 'test' },
        'src/index.ts': { path: 'src/index.ts', type: 'blob', size: 150, url: 'test', html_url: 'test' }
      } as Record<string, GitHubFile>;

      const paths = ['README.md', 'package.json'];
      const files = getFilesByPaths(paths, fileTree);

      expect(files).toHaveLength(2);
      expect(files.map(f => f.path)).toContain('README.md');
      expect(files.map(f => f.path)).toContain('package.json');
    });

    it('should filter out non-existent paths', () => {
      const fileTree = {
        'README.md': { path: 'README.md', type: 'blob', size: 100, url: 'test', html_url: 'test' }
      } as Record<string, GitHubFile>;

      const paths = ['README.md', 'non-existent.txt'];
      const files = getFilesByPaths(paths, fileTree);

      expect(files).toHaveLength(1);
      expect(files[0].path).toBe('README.md');
    });

    it('should handle empty paths array', () => {
      const fileTree = {
        'README.md': { path: 'README.md', type: 'blob', size: 100, url: 'test', html_url: 'test' }
      } as Record<string, GitHubFile>;

      const files = getFilesByPaths([], fileTree);
      expect(files).toHaveLength(0);
    });
  });
});