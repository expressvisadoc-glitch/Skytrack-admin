/**
 * Faint colour glows fixed behind the page so the frosted-glass cards have something to blur. In the light theme
 * they are very soft, so the page still reads as white; in the dark theme they are deeper. Purely decorative.
 * The parent must create a stacking context (Tailwind `isolate`).
 */
export function GlassBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 left-[14%] w-[36rem] h-[36rem] rounded-full blur-3xl bg-rose-200/30 dark:bg-rose-500/15" />
      <div className="absolute top-[12%] right-[4%] w-[30rem] h-[30rem] rounded-full blur-3xl bg-violet-200/30 dark:bg-indigo-500/15" />
      <div className="absolute top-[48%] left-[36%] w-[32rem] h-[32rem] rounded-full blur-3xl bg-amber-100/40 dark:bg-violet-500/10" />
      <div className="absolute -bottom-32 -left-20 w-[30rem] h-[30rem] rounded-full blur-3xl bg-sky-200/30 dark:bg-sky-500/10" />
    </div>
  )
}
