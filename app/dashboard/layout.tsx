import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { TopNav } from '@/components/layout/TopNav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav userEmail={user.email} />
      <main>{children}</main>
    </div>
  )
}
