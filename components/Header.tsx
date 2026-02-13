import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <img 
              src="/logo.png
              " 
              alt="Colégio Satélite" 
              className="h-12"
            />
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-6">
            <Link 
              href="/admin" 
              className="text-gray-700 hover:text-gray-900 font-medium"
            >
              Admin
            </Link>
            <Link 
              href="/login"
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition"
            >
              Login
            </Link>
            
            {/* Language Selector */}
            <button className="flex items-center gap-2 text-gray-700">
              <span className="text-xl">🌐</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}