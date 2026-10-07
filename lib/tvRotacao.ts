const GCC_TV_URL_PADRAO = "https://gcc.colegiosatelite.cloud/";

export function getGccTvUrl(
  satOrigin: string,
  configuredUrl: string | undefined = process.env.NEXT_PUBLIC_GCC_TV_URL
): string | null {
  const address = (configuredUrl ?? GCC_TV_URL_PADRAO).trim();
  if (!address) return null;

  try {
    const gccUrl = new URL(address);
    if (!["http:", "https:"].includes(gccUrl.protocol) || gccUrl.username || gccUrl.password) {
      return null;
    }
    const returnUrl = new URL("/dashboard/view", satOrigin);
    gccUrl.searchParams.set("tv", "sat");
    gccUrl.searchParams.set("voltar", returnUrl.href);
    return gccUrl.href;
  } catch {
    return null;
  }
}
