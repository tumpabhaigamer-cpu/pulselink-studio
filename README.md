# PulseLink Studio

This repository contains both the standalone PulseLink Studio editor and the full-stack Next.js project extracted from the supplied architecture ZIP.

## Live preview

[Open the GitHub Pages editor](https://tumpabhaigamer-cpu.github.io/pulselink-studio/). GitHub Pages serves the root `index.html`, a static browser editor that stores its workspace in local browser storage.

## Next.js source

The ZIP project is included at the repository root (`package.json`, `src/`, and its Next.js/Drizzle configuration). Start the app locally with:

```sh
npm install
npm run dev
```

The API routes, database integration, OAuth, and other server features need a Node.js hosting service and the required environment variables/database. GitHub Pages does not run those server routes; the Pages link is the static editor preview.

## GitHub Pages

Pages is configured to deploy from the `main` branch at `/ (root)`. The root `index.html` remains the published Pages entry point.
