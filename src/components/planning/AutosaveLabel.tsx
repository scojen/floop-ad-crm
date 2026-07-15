import type { AutosaveState } from '../../hooks/useBriefAutosave';

export function AutosaveLabel({ state }: { state: AutosaveState }) {
  switch (state.kind) {
    case 'idle':
      return null;
    case 'dirty':
      return <span className="text-xs text-neutral-400">Unsaved changes…</span>;
    case 'saving':
      return <span className="text-xs text-neutral-400">Saving…</span>;
    case 'saved':
      return (
        <span className="text-xs text-neutral-400">
          Saved ·{' '}
          {new Date(state.at).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </span>
      );
    case 'error':
      return (
        <span className="text-xs font-medium text-red-600">
          Save failed — retrying ({state.message})
        </span>
      );
  }
}
