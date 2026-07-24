import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SignOutButton } from '@/components/auth/sign-out-button'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6">
      <p className="font-arabic text-lg">وصال</p>

      {user ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm">مرحباً، {user.email}</p>
          <Link href="/dashboard" className="text-sm font-medium underline">
            الذهاب إلى لوحة التحكم
          </Link>
          <SignOutButton />
        </div>
      ) : (
        <Link href="/auth/sign-in" className="text-sm font-medium underline">
          تسجيل الدخول
        </Link>
      )}
    </main>
  )
}
