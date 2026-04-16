"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

type BackButtonProps = {
  label?: string;
  href?: string;
};

export default function BackButton({
  label = "Voltar",
  href,
}: BackButtonProps) {
  const router = useRouter();

  function handleClick() {
    if (href) {
      router.push(href);
      return;
    }

    router.back();
  }

  return (
    <button
      onClick={handleClick}
      type="button"
      className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium transition"
    >
      <ArrowLeft size={18} />
      {label}
    </button>
  );
}