import { useSearchParams } from 'react-router-dom';

const VALID = new Set(['world', 'list']);

export function useViewMode() {
  const [params] = useSearchParams();
  const raw = params.get('view');
  const mode = VALID.has(raw) ? raw : 'world';
  return { mode, isList: mode === 'list', isWorld: mode === 'world' };
}
