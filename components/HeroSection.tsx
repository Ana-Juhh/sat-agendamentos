import Link from 'next/link';

type HeroContent = {
  title: string;
  highlight: string;
  description: string;
  rules: Array<{
    title: string;
    text: string;
    accentClass: string;
  }>;
  cta: string;
  imageAlt: string;
  onlineBadge: string;
};

type HeroSectionProps = {
  content: HeroContent;
};

export default function HeroSection({ content }: HeroSectionProps) {
  return (
    <section className="bg-gradient-to-b from-gray-50 to-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h1 className="mb-6 text-5xl leading-tight font-bold text-gray-900">
              {content.title}{' '}
              <span className="text-blue-600">{content.highlight}</span>
            </h1>

            <p className="mb-8 text-lg text-gray-700">{content.description}</p>

            <ul className="mb-10 space-y-5">
              {content.rules.map((rule) => (
                <li
                  key={rule.title}
                  className={`flex items-start rounded-lg border-l-4 bg-white p-3 shadow-sm ${rule.accentClass}`}
                >
                  <span className="mr-2 font-bold text-gray-900">{rule.title}</span>
                  <span className="text-sm text-gray-700">{rule.text}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/login"
              className="inline-block rounded-lg bg-yellow-400 px-8 py-3 text-lg font-bold text-gray-900 transition hover:bg-yellow-500"
            >
              {content.cta}
            </Link>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="absolute -top-10 -right-10 h-64 w-64 rounded-full bg-blue-500 opacity-10 blur-3xl"></div>
            <div className="absolute -bottom-10 -left-10 h-64 w-64 rounded-full bg-yellow-400 opacity-10 blur-3xl"></div>

            <div className="relative z-10 w-full max-w-lg">
              <img
                src="/images/chromebook.png"
                alt={content.imageAlt}
                className="h-auto w-full rounded-3xl border-8 border-white object-cover shadow-2xl transition duration-500 hover:rotate-1"
              />

              <div className="absolute -right-6 -bottom-6 hidden rounded-2xl bg-white p-4 shadow-xl md:block">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 animate-pulse rounded-full bg-green-500"></div>
                  <span className="text-sm font-bold text-gray-800">{content.onlineBadge}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
