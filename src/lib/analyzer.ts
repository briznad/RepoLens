import type { RepoData, FileTree } from './types';
import { githubApi, fetchRepo } from './github';

export interface FileNode {
  path: string;
  name: string;
  type: 'file' | 'directory';
  size?: number;
  extension?: string;
  language?: string;
  children?: FileNode[];
  depth: number;
}

export interface RepositoryMetrics {
  totalFiles: number;
  totalDirectories: number;
  totalSize: number;
  fileTypes: Record<string, number>;
  languages: Record<string, number>;
  averageFileSize: number;
  largestFiles: Array<{ path: string; size: number }>;
  deepestPath: { path: string; depth: number };
}

export interface RepositoryStructure {
  repository: RepoData;
  fileTree: FileNode[];
  metrics: RepositoryMetrics;
  readme: string;
  mainFiles: string[];
  configFiles: string[];
  documentationFiles: string[];
  testFiles: string[];
}

export interface ArchitectureInsight {
  type: 'pattern' | 'structure' | 'dependency' | 'quality';
  title: string;
  description: string;
  files: string[];
  importance: 'low' | 'medium' | 'high';
}

export class RepositoryAnalyzer {
  private owner: string;
  private repo: string;
  private repository?: RepoData;

  constructor(owner: string, repo: string) {
    this.owner = owner;
    this.repo = repo;
  }

  /**
   * Analyze the complete repository structure
   */
  async analyze(): Promise<RepositoryStructure> {
    // Get complete repository analysis
    const analysisResult = await fetchRepo(this.owner, this.repo);
    this.repository = analysisResult.repoData;
    
    // Build file tree from GitHub files
    const fileTree = this.buildFileTree(analysisResult.fileTree);
    
    // Calculate metrics
    const metrics = this.calculateMetrics(analysisResult.fileTree, analysisResult.languages);
    
    // Get README content
    const readme = await this.getReadmeContent();

    return {
      repository: this.repository,
      fileTree,
      metrics,
      readme,
      mainFiles: analysisResult.mainFiles.map(f => f.path),
      configFiles: analysisResult.configFiles.map(f => f.path),
      documentationFiles: analysisResult.documentationFiles.map(f => f.path),
      testFiles: analysisResult.testFiles.map(f => f.path)
    };
  }

  /**
   * Build hierarchical file tree from GitHub tree
   */
  private buildFileTree(tree: FileTree): FileNode[] {
    const nodes = new Map<string, FileNode>();
    const roots: FileNode[] = [];

    // Create all nodes
    for (const item of tree.tree) {
      const pathParts = item.path.split('/');
      const name = pathParts[pathParts.length - 1];
      const extension = this.getFileExtension(name);
      
      const node: FileNode = {
        path: item.path,
        name,
        type: item.type === 'tree' ? 'directory' : 'file',
        size: item.size,
        extension,
        language: this.guessLanguage(extension),
        children: item.type === 'tree' ? [] : undefined,
        depth: pathParts.length - 1
      };

      nodes.set(item.path, node);
    }

    // Build hierarchy
    for (const [path, node] of nodes) {
      const parentPath = path.substring(0, path.lastIndexOf('/'));
      
      if (parentPath && nodes.has(parentPath)) {
        const parent = nodes.get(parentPath)!;
        if (!parent.children) parent.children = [];
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }

    // Sort children
    const sortNodes = (nodes: FileNode[]) => {
      nodes.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      
      nodes.forEach(node => {
        if (node.children) {
          sortNodes(node.children);
        }
      });
    };

    sortNodes(roots);
    return roots;
  }

  /**
   * Calculate repository metrics
   */
  private calculateMetrics(tree: FileTree, languages: Record<string, number>): RepositoryMetrics {
    let totalFiles = 0;
    let totalDirectories = 0;
    let totalSize = 0;
    const fileTypes: Record<string, number> = {};
    const fileSizes: Array<{ path: string; size: number }> = [];
    let deepestPath = { path: '', depth: 0 };

    for (const item of tree.tree) {
      if (item.type === 'blob') {
        totalFiles++;
        totalSize += item.size || 0;
        
        const extension = this.getFileExtension(item.path);
        fileTypes[extension] = (fileTypes[extension] || 0) + 1;
        
        if (item.size) {
          fileSizes.push({ path: item.path, size: item.size });
        }
      } else {
        totalDirectories++;
      }

      const depth = item.path.split('/').length - 1;
      if (depth > deepestPath.depth) {
        deepestPath = { path: item.path, depth };
      }
    }

    // Sort by size and get largest files
    fileSizes.sort((a, b) => b.size - a.size);
    const largestFiles = fileSizes.slice(0, 10);

    return {
      totalFiles,
      totalDirectories,
      totalSize,
      fileTypes,
      languages,
      averageFileSize: totalFiles > 0 ? totalSize / totalFiles : 0,
      largestFiles,
      deepestPath
    };
  }

  /**
   * Get README content
   */
  private async getReadmeContent(): Promise<string> {
    try {
      return await githubApi.fetchFileContent(this.owner, this.repo, 'README.md');
    } catch {
      // Try other README variations
      const readmeFiles = ['README.md', 'README.txt', 'README.rst', 'README'];
      for (const file of readmeFiles) {
        try {
          return await githubApi.fetchFileContent(this.owner, this.repo, file);
        } catch {
          continue;
        }
      }
      return '';
    }
  }

  /**
   * Generate architecture insights
   */
  async generateInsights(structure: RepositoryStructure): Promise<ArchitectureInsight[]> {
    const insights: ArchitectureInsight[] = [];
    
    // Analyze project structure patterns
    insights.push(...this.analyzeProjectStructure(structure));
    
    // Analyze configuration patterns
    insights.push(...this.analyzeConfiguration(structure));
    
    // Analyze code organization
    insights.push(...this.analyzeCodeOrganization(structure));

    return insights;
  }

  private analyzeProjectStructure(structure: RepositoryStructure): ArchitectureInsight[] {
    const insights: ArchitectureInsight[] = [];
    const { fileTree, metrics } = structure;

    // Check for common project patterns
    const hasSource = fileTree.some(node => node.name === 'src' && node.type === 'directory');
    const hasLib = fileTree.some(node => node.name === 'lib' && node.type === 'directory');
    const hasComponents = this.findNodesInTree(fileTree, 'components').length > 0;

    if (hasSource || hasLib) {
      insights.push({
        type: 'structure',
        title: 'Well-organized source structure',
        description: 'Project follows standard directory conventions with dedicated source folders',
        files: hasSource ? ['src/'] : ['lib/'],
        importance: 'medium'
      });
    }

    if (hasComponents) {
      insights.push({
        type: 'pattern',
        title: 'Component-based architecture',
        description: 'Project uses component-based architecture pattern',
        files: ['components/'],
        importance: 'medium'
      });
    }

    return insights;
  }

  private analyzeConfiguration(structure: RepositoryStructure): ArchitectureInsight[] {
    const insights: ArchitectureInsight[] = [];
    const { configFiles } = structure;

    if (configFiles.length > 5) {
      insights.push({
        type: 'quality',
        title: 'Multiple configuration files',
        description: 'Project has extensive configuration setup, indicating mature tooling',
        files: configFiles.slice(0, 5),
        importance: 'low'
      });
    }

    return insights;
  }

  private analyzeCodeOrganization(structure: RepositoryStructure): ArchitectureInsight[] {
    const insights: ArchitectureInsight[] = [];
    const { metrics, testFiles } = structure;

    const testRatio = testFiles.length / metrics.totalFiles;
    if (testRatio > 0.2) {
      insights.push({
        type: 'quality',
        title: 'Good test coverage structure',
        description: 'Project has a substantial number of test files indicating good testing practices',
        files: testFiles.slice(0, 5),
        importance: 'high'
      });
    }

    return insights;
  }

  private findNodesInTree(nodes: FileNode[], name: string): FileNode[] {
    const results: FileNode[] = [];
    
    for (const node of nodes) {
      if (node.name.toLowerCase().includes(name.toLowerCase())) {
        results.push(node);
      }
      if (node.children) {
        results.push(...this.findNodesInTree(node.children, name));
      }
    }
    
    return results;
  }

  private getFileExtension(path: string): string {
    const parts = path.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
  }

  private guessLanguage(extension: string): string | undefined {
    const languageMap: Record<string, string> = {
      'js': 'JavaScript',
      'jsx': 'JavaScript',
      'ts': 'TypeScript',
      'tsx': 'TypeScript',
      'py': 'Python',
      'java': 'Java',
      'go': 'Go',
      'rs': 'Rust',
      'php': 'PHP',
      'rb': 'Ruby',
      'cpp': 'C++',
      'c': 'C',
      'cs': 'C#',
      'swift': 'Swift',
      'kt': 'Kotlin',
      'scala': 'Scala',
      'clj': 'Clojure',
      'hs': 'Haskell',
      'ml': 'OCaml',
      'elm': 'Elm',
      'dart': 'Dart',
      'vue': 'Vue',
      'svelte': 'Svelte'
    };

    return languageMap[extension];
  }
}

// Helper function to create analyzer instance
export const createAnalyzer = (owner: string, repo: string) => {
  return new RepositoryAnalyzer(owner, repo);
};