#!/usr/bin/env python3
"""Free, provider-independent race reconstruction using public Hugging Face Spaces.

Primary: Stability AI Stable Fast 3D (SF3D) on ZeroGPU.
Fallback: Microsoft TRELLIS.2 on ZeroGPU.

No generated candidate is accepted or installed by this script. It only produces
review artifacts. Visual acceptance remains a separate zero-critical-miss gate.
"""
from __future__ import annotations

import argparse
import json
import os
import pathlib
import shutil
import sys
import time
import traceback
from typing import Any

from gradio_client import Client, handle_file

OUT_ROOT = pathlib.Path("artifacts/free-3d-races")
HF_TOKEN = os.environ.get("HF_TOKEN", "").strip() or None

RACES = {
    "cairnborn": {
        "apose": "https://d8j0ntlcm91z4.cloudfront.net/user_3IW29AsWwaKT2gBThWl4v30lXFQ/hf_20260827_215455_c34f5065-d202-4c95-a32a-c5355328bf05.png",
        "turnaround": "https://d8j0ntlcm91z4.cloudfront.net/user_3IW29AsWwaKT2gBThWl4v30lXFQ/hf_20260829_000923_8c5e983c-f451-4d13-9d1a-01ae08424ebd.png",
        "element": "579defc6-18d2-4dd7-83ff-6d23a51f31fe",
    },
    "brinesworn": {
        "apose": "https://d8j0ntlcm91z4.cloudfront.net/user_3IW29AsWwaKT2gBThWl4v30lXFQ/hf_20260827_215456_c32b1ea8-c18b-4a47-8016-136c7e29b9e7.png",
        "turnaround": "https://d8j0ntlcm91z4.cloudfront.net/user_3IW29AsWwaKT2gBThWl4v30lXFQ/hf_20260829_000923_47d68649-e037-4392-8a1e-6b71fa6440ab.png",
        "element": "d504b1e4-275d-4ccc-a07f-ab61bcc6848d",
    },
    "myceliad": {
        "apose": "https://d8j0ntlcm91z4.cloudfront.net/user_3IW29AsWwaKT2gBThWl4v30lXFQ/hf_20260827_215455_1bd2383e-083e-49fd-bee8-431c70e32251.png",
        "turnaround": "https://d8j0ntlcm91z4.cloudfront.net/user_3IW29AsWwaKT2gBThWl4v30lXFQ/hf_20260829_000923_c30853e3-0fbb-4136-9eb9-fddfc58a164e.png",
        "element": "d9b6f30a-fa51-47c4-b22c-70ed66c07081",
    },
    "veylkin": {
        "apose": "https://d8j0ntlcm91z4.cloudfront.net/user_3IW29AsWwaKT2gBThWl4v30lXFQ/hf_20260827_215455_8c56d46e-13e0-4720-b0b7-e72b3ca93be8.png",
        "turnaround": "https://d8j0ntlcm91z4.cloudfront.net/user_3IW29AsWwaKT2gBThWl4v30lXFQ/hf_20260829_000923_5c7ba582-8a5e-4a63-aa16-927ff878b35c.png",
        "element": "57e790db-f7c4-4a5b-a0b1-ed66a1915314",
    },
    "echoed": {
        "apose": "https://d8j0ntlcm91z4.cloudfront.net/user_3IW29AsWwaKT2gBThWl4v30lXFQ/hf_20260827_215455_91e42011-0230-4c39-81a8-0d4b751d60f5.png",
        "turnaround": "https://d8j0ntlcm91z4.cloudfront.net/user_3IW29AsWwaKT2gBThWl4v30lXFQ/hf_20260829_000923_562e70ce-0f84-40f4-8807-ff9cd5f8cdb8.png",
        "element": "09146293-fa83-4aef-b6e1-a3e1ee7dd6db",
    },
}


def log(msg: str) -> None:
    print(msg, flush=True)


def extract_existing_path(value: Any) -> pathlib.Path | None:
    """Find the first downloaded GLB-like path returned by gradio_client."""
    if isinstance(value, str):
        p = pathlib.Path(value)
        if p.exists() and p.is_file() and p.suffix.lower() in {".glb", ".gltf", ".zip"}:
            return p
    if isinstance(value, dict):
        for key in ("path", "value", "url"):
            if key in value:
                found = extract_existing_path(value[key])
                if found:
                    return found
        for v in value.values():
            found = extract_existing_path(v)
            if found:
                return found
    if isinstance(value, (tuple, list)):
        for v in reversed(value):
            found = extract_existing_path(v)
            if found:
                return found
    return None


def copy_candidate(src: pathlib.Path, dst: pathlib.Path) -> pathlib.Path:
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    return dst


def client(space: str) -> Client:
    # Public ZeroGPU Spaces support anonymous calls. HF_TOKEN is optional and is
    # consumed only when already present in the runner environment.
    return Client(space, hf_token=HF_TOKEN, verbose=True, download_files=str(OUT_ROOT / "downloads"))


def run_sf3d(race: str, source_url: str, out: pathlib.Path) -> dict[str, Any]:
    """Run SF3D with max game-friendly settings exposed by the public Space."""
    c = client("stabilityai/stable-fast-3d")
    src = handle_file(source_url)
    log(f"[{race}] SF3D: preprocessing source")
    preprocess = c.predict(src, 0.85, api_name="/requires_bg_remove")

    # The public app uses the same button callback for background removal and
    # generation. Opaque PNGs need one callback to remove the background and a
    # second callback to generate. Transparent inputs can generate on the first.
    result = None
    for attempt in (1, 2):
        log(f"[{race}] SF3D: run_button pass {attempt}")
        result = c.predict(src, 0.85, "Quad", 20000, 2048, api_name="/run_button")
        glb = extract_existing_path(result)
        if glb:
            target = copy_candidate(glb, out / f"{race}-sf3d-hero.glb")
            return {
                "provider": "sf3d",
                "space": "stabilityai/stable-fast-3d",
                "source": source_url,
                "elementId": RACES[race]["element"],
                "status": "generated-unaccepted",
                "glb": str(target),
                "settings": {"foreground_ratio": 0.85, "remesh": "Quad", "target_vertices": 20000, "texture_size": 2048},
                "preprocess": repr(preprocess)[:4000],
                "result": repr(result)[:4000],
            }
    raise RuntimeError(f"SF3D returned no downloadable GLB after two callback passes: {result!r}")


def run_trellis(race: str, source_url: str, out: pathlib.Path) -> dict[str, Any]:
    """Fallback path using TRELLIS.2 when SF3D fails operationally."""
    c = client("microsoft/TRELLIS.2")
    src = handle_file(source_url)
    log(f"[{race}] TRELLIS.2: start session")
    try:
        c.predict(api_name="/start_session")
    except Exception as exc:
        # Some Gradio revisions initialize the session implicitly.
        log(f"[{race}] TRELLIS.2 start_session warning: {exc}")
    log(f"[{race}] TRELLIS.2: preprocess")
    c.predict(src, api_name="/preprocess_image")
    log(f"[{race}] TRELLIS.2: reconstruct at 1024")
    preview = c.predict(
        src,
        0,
        "1024",
        7.5,
        0.7,
        12,
        5.0,
        7.5,
        0.5,
        12,
        3.0,
        1.0,
        0.0,
        12,
        3.0,
        api_name="/image_to_3d",
    )
    log(f"[{race}] TRELLIS.2: extracting GLB")
    result = c.predict(100000, 2048, api_name="/extract_glb")
    glb = extract_existing_path(result)
    if not glb:
        raise RuntimeError(f"TRELLIS.2 returned no downloadable GLB: {result!r}")
    target = copy_candidate(glb, out / f"{race}-trellis2-hero.glb")
    return {
        "provider": "trellis2",
        "space": "microsoft/TRELLIS.2",
        "source": source_url,
        "elementId": RACES[race]["element"],
        "status": "generated-unaccepted",
        "glb": str(target),
        "settings": {"resolution": 1024, "decimation_target": 100000, "texture_size": 2048},
        "preview": repr(preview)[:4000],
        "result": repr(result)[:4000],
    }


def run_one(race: str, force_challenger: bool) -> int:
    cfg = RACES[race]
    out = OUT_ROOT / race
    out.mkdir(parents=True, exist_ok=True)
    record: dict[str, Any] = {
        "race": race,
        "elementId": cfg["element"],
        "sourceApose": cfg["apose"],
        "turnaroundReference": cfg["turnaround"],
        "acceptance": {
            "overallMin": 97,
            "categoryFloor": 95,
            "identityAnatomyMin": 98,
            "silhouetteProportionMin": 97,
            "criticalMissesAllowed": 0,
            "state": "NOT_EVALUATED",
        },
        "candidates": [],
        "errors": [],
        "startedAt": int(time.time()),
    }

    sf3d_ok = False
    try:
        record["candidates"].append(run_sf3d(race, cfg["apose"], out))
        sf3d_ok = True
    except Exception as exc:
        record["errors"].append({"provider": "sf3d", "error": str(exc), "trace": traceback.format_exc()[-12000:]})
        log(f"[{race}] SF3D failed: {exc}")

    # TRELLIS is the challenger when explicitly requested and the automatic
    # fallback when SF3D cannot produce a usable file. This keeps free GPU use
    # disciplined instead of burning public quota on redundant generations.
    if force_challenger or not sf3d_ok:
        try:
            record["candidates"].append(run_trellis(race, cfg["apose"], out))
        except Exception as exc:
            record["errors"].append({"provider": "trellis2", "error": str(exc), "trace": traceback.format_exc()[-12000:]})
            log(f"[{race}] TRELLIS.2 failed: {exc}")

    record["completedAt"] = int(time.time())
    record["generatedCount"] = len(record["candidates"])
    (out / "reconstruction.json").write_text(json.dumps(record, indent=2))

    # Operational success requires at least one real GLB. Visual acceptance is
    # deliberately not inferred here.
    if not record["candidates"]:
        log(f"[{race}] no candidate generated")
        return 2
    log(json.dumps(record, indent=2))
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--race", choices=list(RACES) + ["all"], default="all")
    ap.add_argument("--challenger", action="store_true", help="also run TRELLIS.2 when SF3D succeeds")
    args = ap.parse_args()
    races = list(RACES) if args.race == "all" else [args.race]
    code = 0
    for race in races:
        code = max(code, run_one(race, args.challenger))
    return code


if __name__ == "__main__":
    sys.exit(main())
