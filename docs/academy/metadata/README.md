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

**3. Tutorial engine** — the state machine, both branches of the leave walkthrough, validation,
reset and learner isolation:

```bash
cp docs/academy/metadata/engine-check.ts src/__engine_check.ts
npx vite build --ssr src/__engine_check.ts --outDir /tmp/engine-check && node /tmp/engine-check/__engine_check.js
rm src/__engine_check.ts
```

**4. Demo data safety** — asserts the simulator cannot reach real data, and that the demo dataset
covers every record type Phase 5 calls for:

```bash
cp docs/academy/metadata/safety-check.ts src/__safety_check.ts
npx vite build --ssr src/__safety_check.ts --outDir /tmp/safety-check && node /tmp/safety-check/__safety_check.js
rm src/__safety_check.ts
```

Check 4 is the important one for the simulator: it scans every file under
`src/components/academy/simulator/` and fails if any imports `lib/api` or Supabase, calls `fetch`,
or writes to storage. That is what keeps a tutorial incapable of touching a real record.
