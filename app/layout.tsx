import './globals.css';

export const metadata = {
  title: 'SAT Agendamentos',
  description: 'Sistema de agendamento de Chromebooks',
  icons: {
    icon: [
      { url: '/icon/favicon.ico' },
      { url: '/icon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/icon/ms-icon-152x152.ico',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning data-theme="light">
      <body className="bg-white text-gray-900">
        {children}
      </body>
    </html>
  );
}