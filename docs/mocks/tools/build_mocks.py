#!/usr/bin/env python3
"""Write the Christian Fitness mocks this generator owns, and their entries in docs/mocks/manifest.json.

The HTML files under pages/, dialogs/ and notifications/ are generated from this
folder so the shells, cast and components stay identical across files.
Change a mock here, then run:

    python3 docs/mocks/tools/build_mocks.py                # every screen the generator owns
    python3 docs/mocks/tools/build_mocks.py landing join   # only these screens
    python3 .claude/skills/writing-html-mocks/scripts/check_mocks.py docs/mocks --write

Screens in HAND_EDITED were changed in their HTML by later slices and are left alone, as are
screens the generator does not know (cf_ui.HAND_WRITTEN). Bring one back under the generator by
porting its HTML here and removing it from the list.
"""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import cf_ui  # noqa: E402
import screens_member  # noqa: E402,F401  (registers screens)
import screens_admin  # noqa: E402,F401
import overlays  # noqa: E402,F401
import screens_directory  # noqa: E402,F401  (after overlays: its dialog uses overlays' helpers)
import screens_news  # noqa: E402,F401
import screens_support  # noqa: E402,F401
import screens_publish  # noqa: E402,F401

ROOT = HERE.parent
REQUIRED = {
    "page": ["default", "loading", "empty", "error"],
    "dialog": ["default", "busy", "invalid"],
    "notification": ["info", "success", "warning", "danger"],
}


# Their committed HTML is ahead of this generator: never overwrite them.
HAND_EDITED = {"messages", "profile", "admin-dashboard", "event-editor", "listing-editor", "decline-application", "admin-toast"}
# Screens that no longer exist: their folders and manifest entries are removed.
REMOVED = {"admin-two-step": "page"}


def entry_for(sid: str, s: dict, old: dict | None) -> dict:
    entry = {"id": sid, "kind": s["kind"], "title": s["title"], "group": s["group"]}
    if s.get("route"):
        entry["route"] = s["route"]
    if s.get("opens_from"):
        entry["opens_from"] = s["opens_from"]
    entry["source"] = s.get("source") or ""
    entry["requirements"] = s["requirements"] if s.get("requirements") is not None else (old or {}).get("requirements", [])
    entry["states"] = list(s["states"])
    if s["not_applicable"]:
        entry["not_applicable"] = s["not_applicable"]
    return entry


def main(only: list[str]) -> int:
    unknown = [x for x in only if x not in cf_ui.SCREENS]
    if unknown:
        print(f"unknown screen(s): {', '.join(unknown)}", file=sys.stderr)
        return 2
    path = ROOT / "manifest.json"
    manifest = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {"screens": []}
    listed = {x["id"]: x for x in manifest["screens"]}
    order = [x["id"] for x in manifest["screens"] if x["id"] not in REMOVED]
    count = 0
    for sid, s in cf_ui.SCREENS.items():
        if sid in HAND_EDITED or (only and sid not in only):
            continue
        folder = ROOT / cf_ui.FOLDERS[s["kind"]] / sid
        if folder.exists():
            shutil.rmtree(folder)
        folder.mkdir(parents=True)
        for state, st in s["states"].items():
            html = cf_ui.document(sid, state, st["render"]())
            # LF on every platform: Windows would otherwise write CRLF and change every mock.
            (folder / f"{state}.html").write_text(html, encoding="utf-8", newline="\n")
            count += 1
        listed[sid] = entry_for(sid, s, listed.get(sid))
        if sid not in order:
            # A new screen goes after the screen the generator lists before it, so groups stay together.
            before = [x for x in list(cf_ui.SCREENS)[:list(cf_ui.SCREENS).index(sid)] if x in order]
            order.insert(order.index(before[-1]) + 1 if before else 0, sid)
    for sid, kind in REMOVED.items():
        shutil.rmtree(ROOT / cf_ui.FOLDERS[kind] / sid, ignore_errors=True)
        listed.pop(sid, None)
    manifest = {
        "project": cf_ui.PROJECT,
        "source": "https://www.magicpatterns.com/os/rCJdLHom5zs5XuG3YFh2Pu (canvas Web App)",
        "required_states": REQUIRED,
        "screens": [listed[x] for x in order],
    }
    path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    kinds = {k: sum(1 for x in manifest["screens"] if x["kind"] == k) for k in REQUIRED}
    print(f"wrote {count} mocks; manifest lists {len(manifest['screens'])} screens ({kinds})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
