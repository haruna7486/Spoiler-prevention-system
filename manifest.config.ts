import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'Spoiler Prevention System',
  version: '0.1.0',
  description: 'YouTubeのタイトルやサムネイルからネタバレを隠します。',
  permissions: ['storage'],
  action: {
    default_popup: 'src/popup/index.html',
  },
  options_page: 'src/options/index.html',
  content_scripts: [
    {
      matches: ['https://www.youtube.com/*'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
})