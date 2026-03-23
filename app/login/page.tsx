"use client";

import PocketBase from "pocketbase";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import Image from "next/image";

// 🔹 Instância do PocketBase usando SEMPRE o .env
const pb = new PocketBase(
  process.env.NEXT_PUBLIC_POCKETBASE_URL!
);

export default function LoginPage() {
  const loginWithGoogle = async () => {
    try {
      /**
       * 🔥 ESSENCIAL
       * O redirectUrl garante que:
       * - funcione no celular
       * - funcione com Cloudflare
       * - NÃO quebre no desktop
       */
      const redirectUrl = `${process.env.NEXT_PUBLIC_POCKETBASE_URL}/api/oauth2-redirect`;

      const authData = await pb
        .collection("users")
        .authWithOAuth2({
          provider: "google",
          redirectUrl,
        });

      /**
       * 📱 MOBILE / CLOUDFLARE
       * Google retorna uma URL que PRECISA ser aberta manualmente
       */
      // if (authData?.meta?.url) {
      //   window.location.href = authData.meta.url;
      //   return;
      // }

      /**
       * 💻 DESKTOP / MODO SEGURO (REUNIÃO)
       * Se por algum motivo não redirecionar,
       * mas o auth estiver válido, entra direto
       */
      if (pb.authStore.isValid) {
        window.location.href = "/dashboard";
      }

    } catch (err) {
      console.error("Erro ao fazer login:", err);
      alert("Erro ao fazer login com o Google. Tente novamente.");
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Container principal */}
      <div className="max-w-7xl w-full mx-auto px-8 flex items-center justify-between">
        
        
        {/* Left Side */}
        <div className="max-w-xl">
         <p className="text-3xl md:text-2xl font-semibold text-blue-600 mb-4 tracking-wide">
            Agendamento Satélite
          </p>

          <h1 className="text-5xl font-bold text-gray-900 leading-snug">
            Simplicidade para<br />
            focar no que importa:<br />
  <span className="text-blue-600">aprender.</span>
</h1> <br></br>

          <GoogleSignInButton onClick={loginWithGoogle} />
        </div>

        {/* Right Side (esconde no celular) */}
        <div className="relative hidden md:block overflow-visible">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-yellow-400 rounded-full opacity-30 blur-3xl"></div>

          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-[580px] h-auto object-contain"
          >
            <source src="/videos/mascote.mp4" type="video/mp4" />
          </video>
        </div>
      </div>
    </div>
  );
}
