import { useSearchParams } from 'react-router-dom';

const VALID = new Set(['world', 'list']);

// List view is the default for now — the immersive world view is opt-in
// via ?view=world while it's still being polished.
const DEFAULT_VIEW = 'list';

export function useViewMode() {
  const [params] = useSearchParams();
  const raw = params.get('view');
  const mode = VALID.has(raw) ? raw : DEFAULT_VIEW;
  return { mode, isList: mode === 'list', isWorld: mode === 'world' };
}
