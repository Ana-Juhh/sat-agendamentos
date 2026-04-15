import './globals.css';
import ThemeScript from '@/components/ThemeScript';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="bg-white text-gray-900">
        <ThemeScript />
        {children}
      </body>
    </html>
  );
}
