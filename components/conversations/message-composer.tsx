'use client'

import { Send } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'

type MessageComposerProps = {
  onSend: (content: string) => void
  disabled?: boolean
}

export function MessageComposer({ onSend, disabled = false }: MessageComposerProps) {
  const [value, setValue] = useState('')

  function handleSend() {
    if (disabled) return
    const trimmed = value.trim()
    if (trimmed === '') return

    onSend(trimmed)
    setValue('')
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  const isEmpty = value.trim() === ''

  return (
    <div className="bg-surface flex items-end gap-2 border-t border-gray-200 p-4">
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={1}
        placeholder="اكتب رسالتك هنا..."
        className="focus:border-primary focus:ring-primary max-h-40 flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-1 focus:outline-none disabled:opacity-50"
      />
      <Button type="button" onClick={handleSend} disabled={disabled || isEmpty}>
        <Send className="h-4 w-4" aria-hidden="true" />
        إرسال
      </Button>
    </div>
  )
}
