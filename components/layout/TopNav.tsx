'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Settings, LogOut } from 'lucide-react'
import { toast } from 'sonner'

interface TopNavProps {
  userEmail?: string
}

export function TopNav({ userEmail }: TopNavProps) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Signed out successfully')
    router.push('/login')
    router.refresh()
  }

  const initials = userEmail
    ? userEmail.slice(0, 2).toUpperCase()
    : 'U'

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-xs font-bold">C</span>
          </div>
          <span className="font-semibold text-sm text-foreground">Content CRM</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
            <Avatar className="h-8 w-8 cursor-pointer">
              <AvatarFallback className="text-xs bg-muted">{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">
              {userEmail}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/dashboard/account')}>
              <Settings className="h-4 w-4 mr-2" />
              Account Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
