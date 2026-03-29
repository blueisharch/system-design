// @ts-check
const { themes } = require('prism-react-renderer');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'System Design Notes',
  tagline: 'Distributed systems, architecture patterns, and interview prep.',
  favicon: 'img/favicon.ico',

  // ── CHANGE THESE TWO LINES ───────────────────────────────────────────────
  url: 'https://<your-github-username>.github.io',
  baseUrl: '/system-design-notes/',
  // ────────────────────────────────────────────────────────────────────────

  organizationName: '<your-github-username>',
  projectName: 'system-design-notes',
  trailingSlash: false,
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: { defaultLocale: 'en', locales: ['en'] },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/',             // serve docs at root, not /docs/
          sidebarPath: require.resolve('./sidebars.js'),
          sidebarCollapsible: true,
          sidebarCollapsed: true,
          showLastUpdateTime: true,
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        defaultMode: 'dark',
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'System Design Notes',
        hideOnScroll: true,
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'notesSidebar',
            position: 'left',
            label: 'Notes',
          },
          {
            href: 'https://github.com/<your-github-username>/system-design-notes',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        copyright: 'System Design Notes · Built with Docusaurus',
      },
      prism: {
        theme: themes.github,
        darkTheme: themes.dracula,
        additionalLanguages: ['bash', 'json', 'yaml', 'sql'],
      },
    }),
};

module.exports = config;
