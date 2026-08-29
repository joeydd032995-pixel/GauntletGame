#!/usr/bin/env python3
"""Run free race reconstruction with SF3D raw geometry first.

Visual fidelity is judged before retopology. This intentionally disables SF3D's
optional remesher because the official app warns it can damage thin geometry.
"""
import importlib.util
import pathlib
import shutil
import sys
from gradio_client import Client, handle_file

SCRIPT = pathlib.Path(__file__).with_name('hf_free_reconstruct_races.py')
spec = importlib.util.spec_from_file_location('hf_free_reconstruct_races', SCRIPT)
mod = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(mod)


def run_sf3d_raw(race: str, source_url: str, out: pathlib.Path):
    c = Client('stabilityai/stable-fast-3d', verbose=True,
               download_files=str(mod.OUT_ROOT / 'downloads'))
    src = handle_file(source_url)
    mod.log(f'[{race}] SF3D RAW: initialize image state')
    pre = c.predict(src, 0.85, api_name='/requires_bg_remove')
    # First callback removes the neutral studio background when necessary.
    mod.log(f'[{race}] SF3D RAW: background pass')
    first = c.predict(src, 0.85, 'None', -1, 2048, api_name='/run_button')
    glb = mod.extract_existing_path(first)
    # Opaque inputs require a second click after the first callback has populated
    # the app's hidden background_remove_state. Transparent inputs may finish on 1.
    if not glb:
        mod.log(f'[{race}] SF3D RAW: generation pass')
        second = c.predict(src, 0.85, 'None', -1, 2048, api_name='/run_button')
        glb = mod.extract_existing_path(second)
        result = second
    else:
        result = first
    if not glb:
        raise RuntimeError(f'SF3D raw callback returned no GLB: {result!r}')
    target = out / f'{race}-sf3d-raw-hero.glb'
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(glb, target)
    return {
        'provider': 'sf3d',
        'space': 'stabilityai/stable-fast-3d',
        'source': source_url,
        'elementId': mod.RACES[race]['element'],
        'status': 'generated-unaccepted',
        'glb': str(target),
        'settings': {
            'foreground_ratio': 0.85,
            'remesh': 'None',
            'target_vertices': -1,
            'texture_size': 2048,
            'policy': 'visual-acceptance-before-retopology'
        },
        'preprocess': repr(pre)[:4000],
        'result': repr(result)[:4000],
    }

mod.run_sf3d = run_sf3d_raw
raise SystemExit(mod.main())
