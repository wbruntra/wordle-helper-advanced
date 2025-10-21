import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from './store'

/**
 * Pre-typed hooks for use throughout the app
 * Use these instead of plain `useDispatch` and `useSelector`
 */

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector = <TSelected,>(
  selector: (state: RootState) => TSelected
): TSelected => useSelector(selector)
