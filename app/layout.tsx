import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning data-theme="light">
      <body className="bg-white text-gray-900">
        {children}
      </body>
    </html>
  );
}