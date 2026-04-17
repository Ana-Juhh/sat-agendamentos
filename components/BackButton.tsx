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

    // fallback seguro
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <button
      onClick={handleClick}
      type="button"
      className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 
      rounded-xl bg-gray-100 hover:bg-gray-200 
      text-gray-800 text-sm sm:text-base font-medium 
      transition active:scale-95"
    >
      <ArrowLeft size={18} />
      {label}
    </button>
  );
}