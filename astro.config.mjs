import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://maka-agent.com",
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 4321,
  },
  output: "static",
  compressHTML: true,
  integrations: [sitemap()],
  build: {
    inlineStylesheets: "always",
  },
});
