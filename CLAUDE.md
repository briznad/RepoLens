# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RepoLens is a SvelteKit web application that provides a clear view of any codebase. The project is configured as a modern web app with TypeScript, SCSS styling, and Ionic components for UI. It integrates with Firebase for backend services and includes AI-powered text generation capabilities.

## Development Commands

### Core Development
- `npm run dev` - Start development server with host binding and auto-open
- `npm run build` - Build the application for production
- `npm run preview` - Build and preview the production version

### Testing
- `npm run test` - Run Playwright end-to-end tests
- `npm run test:unit` - Run Vitest unit tests

### Code Quality
- `npm run lint` - Run ESLint for code linting 
- `npm run check` - Run Svelte type checking with TypeScript
- `npm run check:watch` - Run type checking in watch mode

## Architecture Overview

### Frontend Framework
- **SvelteKit 2.x** with **Svelte 5** - Main application framework
- **TypeScript** - Type safety throughout the codebase
- **Ionic/Svelte** - UI component library configured in iOS mode
- **SCSS** - Styling with global themes and component-specific styles

### Backend Services
- **Firebase** - Authentication, Firestore database, and hosting
- **AI Integration** - Multiple providers (Anthropic Claude, Google Gemini) for text generation
- **Server-side API routes** - Located in `src/routes/api/` (though currently empty)

### Project Structure

#### Source Organization (`src/`)
- `lib/components/` - Reusable Svelte components (modals, buttons, UI elements)
- `lib/services/` - External service integrations (Firebase, Firestore, Google Analytics)
- `lib/stores/` - Svelte stores for state management (repo store)
- `lib/types/` - TypeScript type definitions
- `lib/utilities/` - Helper functions and AI text generation utilities
- `lib/images/` - Static image assets
- `routes/` - SvelteKit pages and layouts
- `theme/` - Global SCSS styles and CSS variables

#### Configuration
- **Svelte Config**: Uses multi-adapter setup supporting both static and Vercel deployment
- **Path Aliases**: Configured shortcuts like `$components`, `$services`, `$types`, etc.
- **TypeScript**: Strict mode enabled with Ionic type definitions

#### Key Services
- **Firebase Service** (`lib/services/firebase.ts`): Initializes Firebase app with environment variables
- **Firestore Service** (`lib/services/firestore.ts`): Comprehensive database operations for users, lists, recipes, sharing
- **AI Text Generator** (`lib/utilities/ai-text-generator.ts`): Supports both Anthropic and Google AI providers

### State Management
- Uses Svelte stores pattern
- `repoStore` - Manages repository-related state (currently minimal implementation)
- Reactive Firestore subscriptions for real-time data updates

### Testing Strategy
- **Playwright** for end-to-end testing
- **Vitest** for unit testing
- Test files use `.test.ts` or `.spec.ts` extensions

## Environment Variables

### Required Public Variables (Firebase)
- `PUBLIC_FIREBASE_API_KEY`
- `PUBLIC_FIREBASE_AUTH_DOMAIN` 
- `PUBLIC_FIREBASE_PROJECT_ID`
- `PUBLIC_FIREBASE_STORAGE_BUCKET`
- `PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `PUBLIC_FIREBASE_APP_ID`
- `PUBLIC_FIREBASE_MEASUREMENT_ID`

### Required Private Variables (AI)
- `ANTHROPIC_API_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`

### Optional Variables
- `PUBLIC_USE_AI_PARSER` - Enable/disable AI item parsing

## Build and Deployment

The project supports multiple deployment targets:
- **Static builds** - For traditional hosting (outputs to `dist/`)
- **Vercel** - For serverless deployment
- **Development** - Vite dev server with HMR

Node.js version requirement: `>=20.6.0`