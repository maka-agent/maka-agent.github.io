import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://maka-agent.com",
  output: "static",
  compressHTML: true,
  integrations: [sitemap()],
  build: {
    inlineStylesheets: "auto",
  },
});
