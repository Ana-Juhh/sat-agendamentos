'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { pb } from '@/lib/pocketbase'
import Image from 'next/image'

export default function HeaderDashboard() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    setIsAdmin(!!pb.authStore.model?.isAdmin)

    const unsubscribe = pb.authStore.onChange(() => {
      setIsAdmin(!!pb.authStore.model?.isAdmin)
    })

    return () => unsubscribe()
  }, [])

  function handleLogout() {
    pb.authStore.clear()
    router.push('/login')
  }

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-2 sm:py-4">

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center">
         <img
            src="/logo.png"
            alt="Colégio Satélite"
            className="h-10 sm:h-12 w-auto"
          />


          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-3 sm:gap-6">
            {isAdmin && (
              <Link
                href="/admin"
                className="text-gray-700 hover:text-gray-900 text-sm sm:text-base font-medium"
              >
                Admin
              </Link>
            )}

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
