# Redux Store (TypeScript)

This directory contains the Redux store configuration and slices with full TypeScript support.

## Files

- **`types.ts`** - Centralized type definitions for all state slices and the root state
- **`store.ts`** - Redux store configuration (exports `store`, `RootState`, `AppDispatch`)
- **`hooks.ts`** - Pre-typed Redux hooks (`useAppDispatch`, `useAppSelector`)
- **`gameSlice.ts`** - Game state management (guesses, etc.)
- **`uiSlice.ts`** - UI state management (theme, modals, sidebar, etc.)
- **`MIGRATION_GUIDE.md`** - Guide for migrating components to TypeScript

## Old Files

The old JavaScript versions (`.js` files) are still present and will continue to work alongside the new TypeScript versions. You can delete them once all components have been migrated to use the `.ts` versions.

## Quick Start

### Using the typed hooks in a component:

```typescript
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { addGuess } from '../redux/gameSlice'

function MyComponent() {
  const dispatch = useAppDispatch()
  const guesses = useAppSelector(state => state.game.guesses)
  
  return (
    // Your component JSX
  )
}
```

## Type Safety Benefits

- Full autocomplete for dispatch actions
- Type checking for action payloads
- IDE warnings for incorrect state access
- Better refactoring support
- Documentation through types

See `MIGRATION_GUIDE.md` for detailed migration instructions.
