"use client";

import Link from "next/link";

type Props = {
  title: string;
  icon: React.ReactNode;
  href: string;
};

export default function ServiceCard({ title, icon, href }: Props) {
  return (
    <Link
      href={href}
      className="border rounded-2xl p-10 flex flex-col items-center gap-4 hover:shadow-lg transition bg-white"
    >
      {icon}
      <span className="text-xl font-semibold text-center">{title}</span>
    </Link>
  );
}