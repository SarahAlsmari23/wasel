import { WasalChat } from '@/components/wasal/wasal-chat'
import { createClient } from '@/lib/supabase/server'
import type { WasalMode } from '@/types/wasal'

function parseMode(value: string | string[] | undefined): WasalMode | undefined {
  if (value === 'assistant' || value === 'complaint') return value
  return undefined
}

export default async function WasalPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string | string[] }>
}) {
  const [supabase, params] = await Promise.all([createClient(), searchParams])
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return <WasalChat isAuthenticated={Boolean(user)} initialMode={parseMode(params.mode)} />
}
