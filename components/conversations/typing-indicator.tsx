export function TypingIndicator() {
  return (
    <div className="flex max-w-[80%] items-center gap-1 self-end rounded-2xl bg-black/5 px-4 py-3 dark:bg-white/10">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
    </div>
  )
}
