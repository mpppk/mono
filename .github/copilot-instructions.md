# Mono Workspace

**ALWAYS follow these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

A TypeScript monorepo with algorithm libraries and utility applications using npm workspaces. The repository contains 4 packages: a publishable library (@mpppk/lib), and 3 utility applications (asana, suburi, ryori).

## Working Effectively

Bootstrap, build, and test the repository:
- `npm install` -- installs dependencies. Takes 2 minutes. NEVER CANCEL. Set timeout to 180+ seconds.
- `npm test` -- runs tests for all packages. Takes 11 seconds. NEVER CANCEL. Set timeout to 60+ seconds.
- `npm run format` -- formats all code using Prettier across all workspaces.
- `npm run build -w pkgs/lib` -- builds the lib package. Takes 4 seconds. Set timeout to 30+ seconds.

Individual package operations:
- `npm run test -w pkgs/lib` -- runs tests for lib package only (4 seconds).
- `npm run build -w pkgs/lib` -- builds lib package only (4 seconds).
- `npm run start:dev -w pkgs/asana` -- runs asana application (requires CSV_FILE and SCRAPBOX_PROJECT env vars).
- `npm run start:dev -w pkgs/suburi` -- runs suburi Elasticsearch application (requires Elasticsearch running on localhost:9200).

## Validation

ALWAYS run these commands before committing changes:
- `npm test` -- ensures all tests pass. NEVER CANCEL - wait for completion.
- `npm run format` -- ensures code formatting is consistent.
- ALWAYS run through at least one complete scenario after making changes to verify functionality.

### Manual Validation Scenario
After making changes to the lib package, ALWAYS validate library functionality:
```bash
# Build and test the library
npm run build -w pkgs/lib
npm run test -w pkgs/lib

# Test library import and basic functionality
node -e "const { addToListMap } = require('./pkgs/lib/dist/index.js'); const map = new Map(); addToListMap(map, 'test', 'value'); console.log('✅ Library works:', Array.from(map.entries()));"
```

The CI pipeline (`.github/workflows/all.yaml`) runs:
1. `npm ci -w pkgs/lib`
2. `npm run build -w pkgs/lib` 
3. `npm test -w pkgs/lib`

## Repository Structure

### Key Packages
- **@mpppk/lib** (`pkgs/lib/`) - Core TypeScript library with algorithm implementations (DAGs, graphs, heaps, etc.). This is the main package that gets published to npm.
- **@mpppk/asana** (`pkgs/asana/`) - Utility application that processes Asana CSV exports and generates Scrapbox links.
- **suburi** (`pkgs/suburi/`) - Elasticsearch-based application with sample Game of Thrones indexing.
- **ryori** (`pkgs/ryori/`) - Minimal package (placeholder).

### Project Structure
```
/
├── package.json -- root workspace configuration
├── .github/workflows/ -- CI/CD pipelines
├── pkgs/
│   ├── lib/ -- main publishable library
│   ├── asana/ -- Asana CSV processing app  
│   ├── suburi/ -- Elasticsearch app
│   └── ryori/ -- minimal package
```

## Build and Test System

### Technologies
- **TypeScript** - Primary language across all packages
- **Vitest** - Testing framework
- **tsup** - Build tool for the lib package
- **ESLint** - Linting
- **Prettier** - Code formatting
- **tsx** - TypeScript execution for applications

### Test Commands by Package
Each package runs 4 types of tests in parallel via `run-p test:*`:
- `test:unit` - Vitest unit tests
- `test:lint` - ESLint checks
- `test:format` - Prettier format checks  
- `test:type-check` - TypeScript type checking

### Build Process
The lib package uses tsup to build:
- Dual CJS/ESM output
- TypeScript declaration files
- ES2020 target

## Environment Setup

### Node.js Requirements
- Node.js v20+ (tested with v20.19.4)
- npm v10+ (tested with v10.8.2)

### Application-Specific Setup
For **asana** package:
- Copy `sample.env` to `.env`
- Set `CSV_FILE` to path of Asana CSV export
- Set `SCRAPBOX_PROJECT` to your Scrapbox project name

For **suburi** package:
- Requires Elasticsearch running on localhost:9200
- Use `docker-compose up` in pkgs/suburi/ to start Elasticsearch
- Copy `sample.env` to `.env` and set `GITHUB_TOKEN`

## Common Tasks

### Adding New Dependencies
```bash
# Add to specific package
npm install <package> -w pkgs/<package-name>

# Add to root (affects all packages)
npm install <package>
```

### Creating New Package
```bash
# Creates new package in pkgs/ directory
PKG=<name> npm run pkg:new
```

### Working with Individual Packages  
```bash
# Run specific package commands
npm run test -w pkgs/lib          # Test lib package only (4 seconds)
npm run build -w pkgs/lib         # Build lib package only (4 seconds) 
npm run start:dev -w pkgs/asana   # Start asana app (requires CSV_FILE env)
npm run start:dev -w pkgs/suburi  # Start suburi app (requires Elasticsearch)

# Install dependencies to specific package
npm install <package> -w pkgs/<package-name>
```

### Running Tasks Across All Packages
```bash
npm run test --workspaces    # Run tests in all packages (11 seconds)
npm run format --workspaces  # Format all packages (2 seconds)
```

## Debugging Common Issues

### TypeScript Errors
- All packages have individual `tsconfig.json` files
- The lib package exports types from `./dist/index.d.ts`
- Import paths use exact package names (e.g., `@mpppk/lib`)

### Test Failures
- Individual package tests can be run with `-w pkgs/<package>`
- Vitest shows verbose debug output for algorithm tests
- Format errors can be fixed with `npm run format`
- ESLint warnings about TypeScript version (5.9.2 vs supported <5.6.0) are expected and safe

### Build Issues
- The lib package warning about "types" condition is expected and safe
- Build outputs go to `./dist/` directories
- Clean builds happen automatically via tsup's `clean: true` option
- Vitest CJS deprecation warnings are expected and safe

### Application Startup Issues
- **asana**: Requires `CSV_FILE=asana.csv` and `SCRAPBOX_PROJECT=xxx` in `.env` file
- **suburi**: Requires Elasticsearch running on localhost:9200 (use `docker-compose up` in pkgs/suburi/)

## Package Details

### @mpppk/lib
Main algorithm library containing:
- **DAG operations** - Directed Acyclic Graph algorithms and pathfinding
- **Graph utilities** - String-based graph searching and traversal  
- **Data structures** - Heaps, priority queues, value types
- **Common utilities** - Result types, array helpers, debugging tools

Key exports: `DAG`, `DagForest`, `Nodes`, `Path`, `NonEmptyArray`, `Result`

### Asana Package
Processes Asana CSV exports to generate Scrapbox link format. Main workflow:
1. Load CSV file specified in `CSV_FILE` env var
2. Filter completed tasks by date range
3. Convert Asana URLs to Scrapbox link format
4. Group by sections and output formatted text

### Suburi Package
Elasticsearch integration example with Game of Thrones data indexing. Demonstrates:
- Elasticsearch client setup
- Document indexing
- Search operations
- Docker Compose setup for local development

Run with: `docker-compose up` then `npm run start:dev -w pkgs/suburi`

Fixes #233.