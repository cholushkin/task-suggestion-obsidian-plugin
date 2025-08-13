# Task Suggestion Obsidian Plugin

This plugin adds a folder-specific right-click menu to Obsidian notes.

---

## Development

### Build
Compile TypeScript into `dist/main.js`:

```bash
npm run build
```

### Deploy
Build and copy the plugin into your Obsidian vault automatically:

```bash
npm run deploy
```

### Dev + Deploy Watch
Automatically rebuild and deploy on file changes:

```bash
npm run dev-deploy
```

---

## Folder Structure

```
task-suggestion-obsidian-plugin/
│  package.json
│  README.md
│  manifest.json
│  tsconfig.json
│  esbuild.config.mjs
└─ src/
   │  main.ts
└─ dist/
```

---

## Notes
- Make sure your vault path in `package.json` scripts matches your Obsidian vault.
- Safe mode must be OFF to test community plugins.
