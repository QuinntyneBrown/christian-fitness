#!/usr/bin/env python3
"""Write every Christian Fitness mock and docs/mocks/manifest.json.

The HTML files under pages/, dialogs/ and notifications/ are generated from this
folder so the shells, cast and components stay identical across ~130 files.
Change a mock here, then run:

    python3 docs/mocks/tools/build_mocks.py
    python3 .claude/skills/writing-html-mocks/scripts/check_mocks.py docs/mocks --write
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

ROOT = HERE.parent
REQUIRED = {
    "page": ["default", "loading", "empty", "error"],
    "dialog": ["default", "busy", "invalid"],
    "notification": ["info", "success", "warning", "danger"],
}


def main() -> int:
    for folder in cf_ui.FOLDERS.values():
        target = ROOT / folder
        if target.exists():
            shutil.rmtree(target)
    screens = []
    count = 0
    for sid, s in cf_ui.SCREENS.items():
        folder = ROOT / cf_ui.FOLDERS[s["kind"]] / sid
        folder.mkdir(parents=True, exist_ok=True)
        for state, st in s["states"].items():
            html = cf_ui.document(sid, state, st["render"]())
            # LF on every platform: Windows would otherwise write CRLF and change every mock.
            (folder / f"{state}.html").write_text(html, encoding="utf-8", newline="\n")
            count += 1
        entry = {"id": sid, "kind": s["kind"], "title": s["title"], "group": s["group"]}
        if s.get("route"):
            entry["route"] = s["route"]
        if s.get("opens_from"):
            entry["opens_from"] = s["opens_from"]
        entry["source"] = s.get("source") or ""
        entry["requirements"] = []
        entry["states"] = list(s["states"])
        if s["not_applicable"]:
            entry["not_applicable"] = s["not_applicable"]
        screens.append(entry)
    manifest = {
        "project": cf_ui.PROJECT,
        "source": "https://www.magicpatterns.com/os/rCJdLHom5zs5XuG3YFh2Pu (canvas Web App)",
        "required_states": REQUIRED,
        "screens": screens,
    }
    (ROOT / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    kinds = {k: sum(1 for x in screens if x["kind"] == k) for k in REQUIRED}
    print(f"wrote {count} mocks for {len(screens)} screens ({kinds})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
