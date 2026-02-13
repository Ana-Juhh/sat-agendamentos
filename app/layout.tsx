import './globals.css'


export default function RootLayout({ children }: { children: React.ReactNode }) {
return (
<html lang="pt-BR">
<body className="bg-white text-gray-900">{children}</body>
</html>
)
}