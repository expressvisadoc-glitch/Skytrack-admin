/**
 * Red round arrow that jumps to a related screen. It appears while its item (the nearest element with the
 * Tailwind `group/item` class) is hovered or the arrow is focused, and always on touch screens.
 */
export function ShortcutArrow({ label, onClick, className = '' }: { label: string; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      title={label}
      aria-label={label}
      className={`inline-flex items-center justify-center w-6 h-6 shrink-0 rounded-full bg-red-600 text-white shadow-sm cursor-pointer transition-all opacity-0 group-hover/item:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 hover:bg-red-700 hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 ${className}`}
    >
      <span className="material-symbols-outlined text-[16px] leading-none">arrow_forward</span>
    </button>
  )
}
