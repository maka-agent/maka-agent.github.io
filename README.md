# Maka Website

Official homepage for [Maka](https://github.com/maka-agent/maka-agent), deployed to [maka-agent.com](https://maka-agent.com).

## Development

```sh
npm ci
npm run dev
```

## Verification

```sh
npm run check
npm run build
```

The site is an Astro static build. GitHub Actions publishes `dist/` to GitHub Pages after changes land on `main`. Cloudflare provides authoritative DNS for the custom domain; GitHub Pages terminates HTTPS.

## Design evidence

- [`PRODUCT.md`](./PRODUCT.md) captures audience, positioning, proof, and accessibility requirements.
- [`DESIGN.md`](./DESIGN.md) is the website visual-system source of truth.
- [`HOMEPAGE_BRIEF.md`](./HOMEPAGE_BRIEF.md) records the production homepage contract.
- [`REFERENCE_STUDY.md`](./REFERENCE_STUDY.md) records transferable findings from the public `haoqi.design` reference without copying its content or implementation.
