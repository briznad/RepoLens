<script lang="ts">
  import { page } from '$app/stores';
  
  const repoId = $derived($page.params.id);
  
  let selectedDoc = $state('readme');
  
  const mockDocs = [
    { id: 'readme', title: 'README.md', type: 'markdown' },
    { id: 'contributing', title: 'CONTRIBUTING.md', type: 'markdown' },
    { id: 'api', title: 'API Documentation', type: 'generated' },
    { id: 'changelog', title: 'CHANGELOG.md', type: 'markdown' },
    { id: 'license', title: 'LICENSE', type: 'text' }
  ];
  
  const mockContent: Record<string, string> = {
    readme: `# Repository Name

This is a sample README.md file for demonstration purposes.

## Overview

This repository contains the source code for a sample application that demonstrates various programming patterns and best practices.

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`bash
npm start
\`\`\`

## Contributing

Please read CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests.
    `,
    contributing: `# Contributing Guidelines

Thank you for your interest in contributing to this project!

## How to Contribute

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Code Style

Please follow the existing code style and conventions.
    `,
    api: `# API Documentation

## Endpoints

### GET /api/users
Returns a list of users.

### POST /api/users
Creates a new user.

### GET /api/users/:id
Returns a specific user by ID.
    `,
    changelog: `# Changelog

## [1.0.0] - 2024-01-01
- Initial release
- Added core functionality
- Added documentation

## [0.9.0] - 2023-12-15
- Beta release
- Added testing suite
    `,
    license: `MIT License

Copyright (c) 2024 Repository Owner

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software")...
    `
  };
  
  const handleDocSelect = (docId: string) => {
    selectedDoc = docId;
  };
</script>

<ion-content class="ion-padding">
  <div class="docs-container">
    <!-- Document Navigation -->
    <ion-card class="nav-card">
      <ion-card-header>
        <ion-card-title>Documentation</ion-card-title>
        <ion-card-subtitle>Browse repository documentation</ion-card-subtitle>
      </ion-card-header>
      
      <ion-card-content>
        <div class="doc-nav">
          {#each mockDocs as doc}
            <ion-chip 
              class="doc-chip {selectedDoc === doc.id ? 'selected' : ''}"
              onclick={() => handleDocSelect(doc.id)}
            >
              <ion-icon 
                name={doc.type === 'markdown' ? 'document-text' : doc.type === 'generated' ? 'code' : 'document'}
              ></ion-icon>
              <ion-label>{doc.title}</ion-label>
            </ion-chip>
          {/each}
        </div>
      </ion-card-content>
    </ion-card>
    
    <!-- Document Content -->
    <ion-card class="content-card">
      <ion-card-header>
        <div class="content-header">
          <ion-card-title>{mockDocs.find(d => d.id === selectedDoc)?.title}</ion-card-title>
          <div class="content-actions">
            <ion-button size="small" fill="outline">
              <ion-icon name="copy" slot="start"></ion-icon>
              Copy
            </ion-button>
            <ion-button size="small" fill="outline">
              <ion-icon name="download" slot="start"></ion-icon>
              Download
            </ion-button>
          </div>
        </div>
      </ion-card-header>
      
      <ion-card-content>
        <div class="doc-content">
          <pre>{mockContent[selectedDoc] || 'Content not available'}</pre>
        </div>
      </ion-card-content>
    </ion-card>
    
    <!-- Document Info -->
    <ion-card class="info-card">
      <ion-card-header>
        <ion-card-title>Document Information</ion-card-title>
      </ion-card-header>
      
      <ion-card-content>
        <ion-list>
          <ion-item>
            <ion-icon name="document" slot="start"></ion-icon>
            <ion-label>
              <h3>Type</h3>
              <p>{mockDocs.find(d => d.id === selectedDoc)?.type || 'Unknown'}</p>
            </ion-label>
          </ion-item>
          
          <ion-item>
            <ion-icon name="time" slot="start"></ion-icon>
            <ion-label>
              <h3>Last Updated</h3>
              <p>2 days ago</p>
            </ion-label>
          </ion-item>
          
          <ion-item>
            <ion-icon name="text" slot="start"></ion-icon>
            <ion-label>
              <h3>Word Count</h3>
              <p>{(mockContent[selectedDoc] || '').split(' ').length} words</p>
            </ion-label>
          </ion-item>
          
          <ion-item>
            <ion-icon name="analytics" slot="start"></ion-icon>
            <ion-label>
              <h3>Lines</h3>
              <p>{(mockContent[selectedDoc] || '').split('\n').length} lines</p>
            </ion-label>
          </ion-item>
        </ion-list>
      </ion-card-content>
    </ion-card>
  </div>
</ion-content>

<style lang="scss">
  .docs-container {
    max-width: 1000px;
    margin: 0 auto;
  }

  .nav-card {
    margin-bottom: 20px;
  }

  .doc-nav {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .doc-chip {
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      transform: translateY(-1px);
    }
    
    &.selected {
      --background: var(--ion-color-primary);
      --color: var(--ion-color-primary-contrast);
    }
  }

  .content-card {
    margin-bottom: 20px;
  }

  .content-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
  }

  .content-actions {
    display: flex;
    gap: 8px;
  }

  .doc-content {
    background: var(--ion-color-light);
    border-radius: 8px;
    padding: 20px;
    margin-top: 16px;
    
    pre {
      white-space: pre-wrap;
      word-wrap: break-word;
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
      line-height: 1.5;
      margin: 0;
      color: var(--ion-color-dark);
    }
  }

  .info-card {
    margin-bottom: 20px;
  }

  @media (max-width: 768px) {
    .content-header {
      flex-direction: column;
      align-items: stretch;
    }
    
    .content-actions {
      justify-content: center;
    }
  }
</style>