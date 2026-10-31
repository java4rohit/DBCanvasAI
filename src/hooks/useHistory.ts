import { useReducer, useCallback, useRef } from 'react';
import type { Table, Relation } from '../types/schema';

export interface HistorySnapshot {
  tables: Table[];
  relations: Relation[];
}

interface HistoryState {
  past: HistorySnapshot[];
  present: HistorySnapshot;
  future: HistorySnapshot[];
}

type HistoryAction =
  | { type: 'PUSH'; snapshot: HistorySnapshot }
  | { type: 'UNDO' }
  | { type: 'REDO' };

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'PUSH':
      return {
        past: [...state.past, state.present],
        present: action.snapshot,
        future: [],
      };
    case 'UNDO': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
      };
    }
    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        past: [...state.past, state.present],
        present: next,
        future: state.future.slice(1),
      };
    }
    default:
      return state;
  }
}

export function useHistory(initial: HistorySnapshot) {
  const [state, dispatch] = useReducer(historyReducer, {
    past: [],
    present: initial,
    future: [],
  });

  // Use a ref so push/undo/redo callbacks are stable (don't cause re-render loops)
  const stateRef = useRef(state);
  stateRef.current = state;

  const push = useCallback((snapshot: HistorySnapshot) => {
    dispatch({ type: 'PUSH', snapshot });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  return {
    tables: state.present.tables,
    relations: state.present.relations,
    push,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
