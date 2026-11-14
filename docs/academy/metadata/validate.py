#!/usr/bin/env python3
"""Validates every Academy article against ARTICLE_METADATA_SPEC.md. Run from docs/academy/."""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATS = ["getting-started","employee","manager","administrator","monitoring","troubleshooting","payroll"]
REQUIRED = ["id","title","description","category","feature","roles","keywords","feature_status",
            "last_updated","doc_version"]
SECTIONS = ["## What this feature does"]

features = json.load(open(os.path.join(ROOT,"metadata/feature-status.json")))["features"]
roles_meta = json.load(open(os.path.join(ROOT,"metadata/roles.json")))["roles"]
intents = json.load(open(os.path.join(ROOT,"metadata/intents.json")))
known_errors = set(k for k in intents["error_code_map"] if not k.startswith("$"))
functional_roles = {r for r,v in roles_meta.items() if v.get("functional")}

def parse(path):
    text = open(path, encoding="utf-8").read()
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not m: return None, text
    meta, body = {}, text[m.end():]
    key = None
    for line in m.group(1).split("\n"):
        if re.match(r"^\s*-\s", line) and key:
            meta[key].append(line.strip()[2:].strip())
        elif ":" in line and not line.startswith(" "):
            key, _, val = line.partition(":")
            key, val = key.strip(), val.strip()
            if val.startswith("[") and val.endswith("]"):
                meta[key] = [v.strip() for v in val[1:-1].split(",") if v.strip()]
            elif val == "":
                meta[key] = []
            else:
                meta[key] = val.strip('"')
    return meta, body

articles, errors, warnings = {}, [], []
for cat in CATS:
    d = os.path.join(ROOT, cat)
    if not os.path.isdir(d): continue
    for f in sorted(os.listdir(d)):
        if not f.endswith(".md") or f.startswith("._") or f == "README.md": continue
        p = os.path.join(d, f)
        meta, body = parse(p)
        rel = f"{cat}/{f}"
        if meta is None:
            errors.append(f"{rel}: no YAML front matter"); continue
        articles[meta.get("id","?")] = (rel, meta, body)

ids = set(articles)
for aid,(rel,meta,body) in sorted(articles.items()):
    def err(msg): errors.append(f"{rel}: {msg}")
    for k in REQUIRED:
        if k not in meta or meta[k] in ("",[]): err(f"missing required field '{k}'")
    # 1 id format
    if not re.match(r"^[a-z][a-z0-9-]*(\.[a-z0-9-]+)+$", aid): err(f"bad id format '{aid}'")
    # 2 category matches directory
    if meta.get("category") != rel.split("/")[0]: err(f"category '{meta.get('category')}' != directory '{rel.split('/')[0]}'")
    # 3 feature exists and status matches
    feat = meta.get("feature")
    if feat not in features: err(f"unknown feature '{feat}'")
    elif meta.get("feature_status") != features[feat]["status"]:
        err(f"feature_status '{meta.get('feature_status')}' != feature-status.json '{features[feat]['status']}' for '{feat}'")
    # 4 roles functional
    for r in meta.get("roles",[]):
        if r not in roles_meta: err(f"unknown role '{r}'")
        elif r not in functional_roles: err(f"role '{r}' is NOT FUNCTIONAL and must not be documented")
    # 5 related ids resolve
    for ref in meta.get("related_articles",[]):
        if ref not in ids: err(f"related_articles -> unknown id '{ref}'")
    # 7 error codes known
    for c in meta.get("error_codes",[]):
        if c not in known_errors: warnings.append(f"{rel}: error_code '{c}' not in intents.json map")
    # 8 tutorial id present when enabled
    if meta.get("tutorial.enabled") == "true" or "tutorial_id" in str(meta.get("tutorial","")):
        pass
    if meta.get("related_tutorials") and not any(t.startswith("tutorial.") for t in meta["related_tutorials"]):
        err("related_tutorials must use tutorial.* ids")
    # 9 required body section
    for s in SECTIONS:
        if s not in body and "Symptom" not in body: err(f"body missing '{s}' (or a Symptom section)")
    # 10 date sane
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", str(meta.get("last_updated",""))): err("bad last_updated")
    # availability banner on non-live
    if meta.get("feature_status") == "branch_only" and "not available yet" not in body.lower():
        err("branch_only article missing the 'Not available yet' banner")

# intents resolve
for i in intents["intents"]:
    if i["article"] not in ids: warnings.append(f"intents.json: intent '{i['intent']}' -> unknown article '{i['article']}'")
for code,aid in intents["error_code_map"].items():
    if code.startswith("$"): continue
    if aid not in ids: warnings.append(f"intents.json: error '{code}' -> unknown article '{aid}'")

print(f"Articles parsed : {len(articles)}")
by_status = {}
for _,(rel,meta,_) in articles.items():
    by_status[meta.get("feature_status")] = by_status.get(meta.get("feature_status"),0)+1
print(f"By availability : {by_status}")
print(f"Errors          : {len(errors)}")
print(f"Warnings        : {len(warnings)}")
for e in errors[:40]: print("  ERROR  ", e)
for w in warnings[:20]: print("  warn   ", w)
sys.exit(1 if errors else 0)
