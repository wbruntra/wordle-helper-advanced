# TypeScript Migration Guide

This document provides instructions for gradually migrating the Wordle Helper backend from JavaScript to TypeScript.

## Overview

The backend now supports TypeScript alongside the existing JavaScript code. This allows for gradual migration at your own pace.

## What's Been Added

### Dependencies
- `typescript` - TypeScript compiler
- `@types/node` - Node.js type definitions
- `@types/express` - Express.js type definitions
- `@types/cors`, `@types/morgan`, `@types/lodash` - Type definitions for dependencies
- `ts-node-dev` - Development server with hot reload for TypeScript

### Configuration Files
- `tsconfig.json` - TypeScript compiler configuration
- `src/types/index.ts` - Common type definitions for the application

### New NPM Scripts
- `npm run api:ts` - Run the server with TypeScript using ts-node-dev
- `npm run build` - Compile TypeScript to JavaScript
- `npm run build:watch` - Compile TypeScript with watch mode
- `npm run start` - Run the compiled JavaScript from dist/
- `npm run dev` - Development mode with hot reload
- `npm run type-check` - Check types without emitting files

## Getting Started

### Option 1: Continue Using JavaScript (No Changes Needed)
```bash
# Existing command still works
npm run api
```

### Option 2: Use TypeScript for New Files
```bash
# Run with TypeScript (will automatically compile .ts files)
npm run api:ts
```

### Option 3: Full TypeScript Development
```bash
# Development with hot reload
npm run dev

# Build for production
npm run build
npm run start
```

## Migration Strategy

### Phase 1: Setup (Complete) ✅
- TypeScript configuration installed
- Type definitions added
- Example TypeScript files created

### Phase 2: Gradual Migration
1. **Start with utility functions** - Convert simple utility modules first
2. **Move to routes** - Convert Express routes one by one
3. **Handle core logic** - Convert `getGuesses.js` and related modules
4. **Database layer** - Add type definitions for Knex operations

### Phase 3: Full TypeScript Conversion
- All `.js` files converted to `.ts`
- Strict type checking enabled
- Comprehensive error handling

## File Conversion Examples

### Before (JavaScript)
```javascript
// app.js
app.post('/api/get-presigned-url', async (req, res) => {
  const { fileName, fileType } = req.body;
  // ... rest of implementation
});
```

### After (TypeScript)
```typescript
// app.ts
interface PresignedUrlRequest {
  fileName: string;
  fileType: string;
}

app.post('/api/get-presigned-url', async (req: Request<{}, PresignedUrlResponse, PresignedUrlRequest>, res: Response<PresignedUrlResponse>) => {
  const { fileName, fileType } = req.body;
  // ... rest of implementation with type safety
});
```

## Best Practices

### 1. Type Definitions
- Define interfaces for all API requests/responses
- Create types for database models
- Use `any` sparingly, prefer `unknown` when types are uncertain

### 2. Error Handling
```typescript
// Instead of: try/catch without types
try {
  // code
} catch (err) {
  console.log(err.message);
}

// Use proper error types
try {
  // code
} catch (error) {
  console.error('Operation failed:', error instanceof Error ? error.message : error);
  res.status(500).json({ error: 'Operation failed' });
}
```

### 3. Database Operations
```typescript
// Define interfaces for database rows
interface WordClassificationRow {
  id: number;
  word: string;
  classification: string;
}

// Use in Knex operations
const classifications = await knex<WordClassificationRow>('word_classifications')
  .where('classification', 'common')
  .select();
```

## Development Workflow

### During Migration
1. Convert one file at a time
2. Run `npm run type-check` to validate types
3. Test functionality after each conversion
4. Commit changes incrementally

### Testing
```bash
# Type checking
npm run type-check

# Existing tests still work
npm run test

# Watch tests
npm run test:watch
```

## Configuration Details

### tsconfig.json
- Target: ES2020 (matches Node.js features)
- Module: CommonJS (for compatibility)
- Strict mode: Enabled (can be relaxed during migration)
- Output: `./dist` directory

### Import Paths
```typescript
// Absolute imports work with @ alias
import { S3Service } from '@/types/s3';

// Relative imports as usual
import { getGuesses } from './getGuesses';
```

## Troubleshooting

### Common Issues

1. **Missing Types**: Add `@types/package-name` for dependencies
2. **Import Errors**: Check `tsconfig.json` include/exclude patterns
3. **Strict Mode Errors**: Use `// @ts-ignore` temporarily during migration
4. **Knex Types**: Use `knex<TypeName>('table')` for typed queries

### Type Definition Locations
- Custom types: `src/types/index.ts`
- Node.js types: Built into `@types/node`
- Express types: Built into `@types/express`

## Next Steps

1. **Pick a simple file** to convert first (e.g., a utility module)
2. **Add type definitions** for your existing code
3. **Run the TypeScript server** to test your changes
4. **Gradually convert** remaining files
5. **Enable stricter checks** as you become more comfortable

Remember: You can run both JavaScript and TypeScript files side by side during the migration process!