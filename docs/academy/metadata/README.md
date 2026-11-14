# Academy checks

Two checks guard the corpus. Run both before publishing content changes.

**1. Metadata and links** — validates all 10 rules in `../ARTICLE_METADATA_SPEC.md`:

```bash
cd docs/academy && python3 metadata/validate.py
```

**2. Parsing, role filtering and search** — exercises the shipped `src/lib/academy.ts` in Node by
building it through Vite, so `import.meta.glob` resolves exactly as it does in the app:

```bash
cd skytrack-admin
cp docs/academy/metadata/academy-check.ts src/__academy_check.ts
npx vite build --ssr src/__academy_check.ts --outDir /tmp/academy-check && node /tmp/academy-check/__academy_check.js
rm src/__academy_check.ts
```

The second check is what caught that "salary cut" — the worked example in the brief — did not rank
the deductions article, because the phrase was a keyword but not a curated intent.
