interface AssistantLauncherProps {
  onOpen?: () => void
}

/**
 * Floating entry point for the Academy assistant. The assistant itself is a later phase; this
 * reserves the position and states plainly that it is not ready, rather than opening a dead panel.
 */
export function AssistantLauncher({ onOpen }: AssistantLauncherProps) {
  const available = Boolean(onOpen)
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!available}
      title={available ? 'Ask the Academy assistant' : 'The Academy assistant is not available yet'}
      aria-label={available ? 'Ask the Academy assistant' : 'Academy assistant, not available yet'}
      className="fixed bottom-6 right-6 z-30 h-13 px-4 py-3.5 rounded-full shadow-lg flex items-center gap-2 text-[12.5px] font-bold transition-all bg-slate-900 text-white disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:scale-[1.03] enabled:cursor-pointer"
    >
      <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
      <span className="hidden sm:inline">{available ? 'Ask Academy' : 'Assistant coming soon'}</span>
    </button>
  )
}
