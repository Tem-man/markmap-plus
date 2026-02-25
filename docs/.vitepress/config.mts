import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "markmap-plus",
  base: '/markmap-plus-docs/',
  description: "Usage documentation for the markmap-plus package",
  themeConfig: {
    nav: [
      { text: 'Introduction', link: '/introduction/' },
      { text: 'Installation', link: '/installation/' },
      { text: 'Example', link: '/example/' },
      { text: 'Mind Map Interaction', link: '/mind-map-interaction/' },
      { text: 'API', link: '/api/' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Introduction', link: '/introduction/' },
          { text: 'Installation', link: '/installation/' },
          { text: 'Example', link: '/example/' },
          { text: 'Mind Map Interaction', link: '/mind-map-interaction/' },
          { text: 'API', link: '/api/' },
        ],
      },
    ],
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/markmap/markmap',
      },
    ],
  },
})
