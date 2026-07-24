export function TypingIndicator() {
  return (
    <div className="bg-surface flex max-w-[80%] items-center gap-1 self-end rounded-2xl px-4 py-3 shadow-sm">
      <span className="bg-secondary h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.3s]" />
      <span className="bg-secondary h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.15s]" />
      <span className="bg-secondary h-1.5 w-1.5 animate-bounce rounded-full" />
    </div>
  )
}
