# Redux Store TypeScript Migration Guide

This guide explains how to update your components to use the new TypeScript Redux setup.

## Overview of Changes

The Redux store has been converted to TypeScript with proper type definitions:

- **`types.ts`** - Centralized type definitions for all Redux state slices
- **`store.ts`** - Redux store configuration with exported types (`RootState`, `AppDispatch`)
- **`gameSlice.ts`** - Game state slice with typed reducers and actions
- **`uiSlice.ts`** - UI state slice with typed reducers and actions
- **`hooks.ts`** - Pre-typed Redux hooks for consistent usage

## Using Typed Hooks

Instead of importing directly from `react-redux`, use the pre-typed hooks from `redux/hooks.ts`:

### Before (JavaScript):
```javascript
import { useDispatch, useSelector } from 'react-redux'

function MyComponent() {
  const dispatch = useDispatch()
  const guesses = useSelector(state => state.game.guesses)
  return ...
}
```

### After (TypeScript):
```typescript
import { useAppDispatch, useAppSelector } from '../redux/hooks'

function MyComponent() {
  const dispatch = useAppDispatch()
  const guesses = useAppSelector(state => state.game.guesses)
  return ...
}
```

## Using Typed Actions

All actions are properly typed. The dispatch will now provide type checking:

```typescript
import { useAppDispatch } from '../redux/hooks'
import { addGuess } from '../redux/gameSlice'

function MyComponent() {
  const dispatch = useAppDispatch()
  
  const handleAddGuess = () => {
    // TypeScript will check that you're providing the correct payload
    dispatch(addGuess({
      word: 'hello',
      key: 'abcde'
    }))
  }
  
  return ...
}
```

## Type Definitions

### Game State
```typescript
interface GameState {
  guesses: Guess[]
}

interface Guess {
  word: string
  key: string
}
```

### UI State
```typescript
interface UIState {
  theme: 'light' | 'dark'
  isSidebarOpen: boolean
  modals: UIModals
}

interface UIModals {
  wordList: boolean
  upload: boolean
  analysis: boolean
}
```

### Root State
```typescript
interface RootState {
  ui: UIState
  game: GameState
}
```

## Migration Steps for Components

1. Convert component files from `.js` to `.tsx`
2. Import typed hooks: `import { useAppDispatch, useAppSelector } from '../redux/hooks'`
3. Replace `useDispatch` with `useAppDispatch`
4. Replace `useSelector` with `useAppSelector`
5. Import actions from the slice: `import { actionName } from '../redux/sliceFile'`

Example migration:

```typescript
// Before
export default function GameComponent() {
  const dispatch = useDispatch()
  const guesses = useSelector(state => state.game.guesses)
  
  const handleAddGuess = (word, key) => {
    dispatch(addGuess({ word, key }))
  }
}

// After
export default function GameComponent() {
  const dispatch = useAppDispatch()
  const guesses = useAppSelector(state => state.game.guesses)
  
  const handleAddGuess = (word: string, key: string) => {
    dispatch(addGuess({ word, key }))
  }
}
```

## Adding New State

When adding new Redux state:

1. Add types to `types.ts`
2. Create a new slice file (e.g., `newSlice.ts`) using the same patterns as `gameSlice.ts` and `uiSlice.ts`
3. Import and add the slice to the `rootReducer` in `store.ts`
4. Update the `RootState` interface in `types.ts` if needed

## Next Steps

You can gradually migrate components one by one. Components using the old JavaScript Redux setup will still work alongside TypeScript components.
