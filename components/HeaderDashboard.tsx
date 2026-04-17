'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSyncExternalStore } from 'react'
import { pb } from '@/lib/pocketbase'
import { shouldShowAdminArea } from '@/lib/roles'
import ThemeToggle from '@/components/ThemeToggle'

function subscribe(callback: () => void) {
  return pb.authStore.onChange(() => {
    callback()
  })
}

function getAdminSnapshot() {
  const model = pb.authStore.model as { role?: string } | null
  return shouldShowAdminArea(model?.role)
}

export default function HeaderDashboard() {
  const router = useRouter()
  const pathname = usePathname()
  const canAccessAdminArea = useSyncExternalStore(subscribe, getAdminSnapshot, () => false)
  const shouldShowThemeToggle = true

  function handleLogout() {
    pb.authStore.clear()
    router.push('/login')
  }

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-2 sm:py-4">
          <Link href="/dashboard" className="flex items-center">
            <img
              src="/logo.png"
              alt="Colegio Satelite"
              className="site-logo site-logo--light h-10 w-auto sm:h-12"
            />
            <img
              src="/logobranco.png"
              alt="Colegio Satelite"
              className="site-logo site-logo--dark h-10 w-auto sm:h-12"
            />
          </Link>

          <nav className="flex items-center gap-3 sm:gap-6">
            {canAccessAdminArea && (
              <Link
                href="/admin"
                className="text-gray-700 hover:text-gray-900 text-sm sm:text-base font-medium"
              >
                Admin
              </Link>
            )}

            {shouldShowThemeToggle ? <ThemeToggle variant="inline" /> : null}

            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white 
             px-3 py-1.5 sm:px-6 sm:py-2 
             text-sm sm:text-base
             rounded-lg font-medium transition"
            >
              Logout
            </button>
          </nav>
        </div>
      </div>
    </header>
  )
}
