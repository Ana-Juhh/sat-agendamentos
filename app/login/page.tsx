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
    <div className="relative flex min-h-screen bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col justify-center gap-8 px-5 py-8 sm:px-6 md:gap-10 md:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="relative order-1 flex w-full min-w-0 flex-1 items-center justify-center overflow-visible lg:order-2 lg:justify-end">
          <div className="relative z-10 w-full max-w-[14rem] rounded-[2rem] bg-white sm:max-w-[18rem] md:max-w-[22rem] lg:max-w-[min(30rem,34vw)] xl:max-w-[min(32rem,36vw)]">
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
    </div>
  );
}
