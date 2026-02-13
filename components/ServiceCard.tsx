import Link from 'next/link'

export default function ServiceCard({ title, icon, href }: any) {
return (
<Link href={href}>
<div className="border rounded-2xl p-10 flex flex-col items-center gap-4 hover:shadow-lg transition">
{icon}
<span className="text-xl font-semibold">{title}</span>
</div>
</Link>
)
}