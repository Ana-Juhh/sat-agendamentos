"use client";

import { useEffect } from "react";
import { pb } from "@/lib/pocketbase";
import { useRouter } from "next/navigation";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    pb.authStore.onChange(() => {
      if (pb.authStore.isValid) {
        router.push("/dashboard"); // ou /
      }
    });
  }, [router]);

  return <p>Finalizando login...</p>;
}
