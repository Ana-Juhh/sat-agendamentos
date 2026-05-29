"use client";

import PocketBase from "pocketbase";

import GoogleSignInButton from "@/components/GoogleSignInButton";

const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL!);

export default function LoginPage() {
  const loginWithGoogle = async () => {
    try {
      const redirectUrl = `${process.env.NEXT_PUBLIC_POCKETBASE_URL}/api/oauth2-redirect`;

      const authData = await pb.collection("users").authWithOAuth2({
        provider: "google",
        redirectUrl,
      });

      if (authData?.meta?.url) {
        window.location.href = authData.meta.url;
        return;
      }

      if (pb.authStore.isValid) {
        window.location.href = "/dashboard";
      }
    } catch (err) {
      console.error("Erro ao fazer login:", err);
      alert("Erro ao fazer login com o Google. Tente novamente.");
    }
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col justify-center gap-8 px-5 py-8 sm:px-6 md:gap-10 md:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="relative order-1 flex w-full min-w-0 flex-1 items-center justify-center overflow-visible lg:order-2 lg:justify-end">
          <div className="relative flex w-full max-w-[18rem] flex-col items-center sm:max-w-[22rem] md:max-w-[26rem] lg:max-w-[min(34rem,38vw)] xl:max-w-[min(36rem,40vw)]">
            <div className="relative z-20 mb-[-0.5rem] max-w-[16rem] animate-[mascoteBubbleIn_900ms_ease-out_350ms_both] rounded-[1.5rem] border border-blue-100 bg-white px-5 py-3 text-center shadow-[0_18px_45px_rgba(37,99,235,0.12)] sm:max-w-[18rem]">
              <p className="text-sm font-semibold text-gray-700 sm:text-base">
                Oi! Eu sou o{" "}
                <span className="font-black text-blue-600">Mano Isa</span>
              </p>

              <div className="absolute bottom-[-0.55rem] left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b border-r border-blue-100 bg-white" />
            </div>

            <div className="relative z-10 w-full rounded-[2rem] bg-white">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="h-auto max-h-[32vh] w-full rounded-[2rem] bg-white object-contain sm:max-h-[38vh] md:max-h-[44vh] lg:max-h-[58vh]"
              >
                <source src="/videos/mascote.mp4" type="video/mp4" />
              </video>
            </div>

            <div className="relative z-20 mt-[-0.4rem] rounded-full border border-blue-100 bg-white px-5 py-2 shadow-[0_14px_35px_rgba(37,99,235,0.10)]">
              <p className="text-sm font-bold tracking-wide text-blue-600 sm:text-base">
                Mano Isa • Mascote do TI
              </p>
            </div>
          </div>
        </div>

        <div className="order-2 max-w-xl flex-1 text-center lg:order-1 lg:text-left">
          <p className="mb-4 text-2xl font-semibold tracking-wide text-blue-600 sm:text-3xl md:text-2xl">
            Agendamento Satélite
          </p>

          <h1 className="text-4xl leading-snug font-bold text-gray-900 sm:text-5xl">
            Simplicidade para
            <br />
            focar no que importa:
            <br />
            <span className="text-blue-600">aprender.</span>
          </h1>

          <div className="mt-8 flex justify-center lg:justify-start">
            <GoogleSignInButton onClick={loginWithGoogle} />
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes mascoteBubbleIn {
          0% {
            opacity: 0;
            transform: translateY(16px) scale(0.96);
          }

          70% {
            opacity: 1;
            transform: translateY(-3px) scale(1.02);
          }

          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}