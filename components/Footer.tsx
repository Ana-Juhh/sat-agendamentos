type FooterContent = {
  supportEmailLabel: string;
  copyright: string;
};

type FooterProps = {
  content: FooterContent;
};

export default function Footer({ content }: FooterProps) {
  return (
    <footer className="border-t border-gray-200 bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <p className="text-gray-600">
            {content.supportEmailLabel}{' '}
            <a href="mailto:ana.julia@colegiosatelite.com.br" className="text-blue-600 hover:underline">
              ana.julia@colegiosatelite.com.br
            </a>
          </p>
          <p className="text-gray-600">{content.copyright}</p>
        </div>
      </div>
    </footer>
  );
}
