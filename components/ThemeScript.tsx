const themeScript = `
  (function () {
    try {
      var path = window.location.pathname;

      if (path === '/' || path === '/login') {
        document.documentElement.dataset.theme = 'light';
        document.documentElement.style.colorScheme = 'light';
        return;
      }

      var savedTheme = window.localStorage.getItem('site-theme');
      var theme = savedTheme === 'dark' ? 'dark' : 'light';

      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    } catch (error) {
      document.documentElement.dataset.theme = 'light';
      document.documentElement.style.colorScheme = 'light';
    }
  })();
`;

export default function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />;
}