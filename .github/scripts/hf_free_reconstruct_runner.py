#!/usr/bin/env python3
"""Compatibility runner for the free SF3D/TRELLIS reconstruction tournament."""
import importlib.util
import pathlib
import sys
from gradio_client import Client

SCRIPT = pathlib.Path(__file__).with_name('hf_free_reconstruct_races.py')
spec = importlib.util.spec_from_file_location('hf_free_reconstruct_races', SCRIPT)
mod = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(mod)

def compatible_client(space: str):
    # gradio_client 2.x removed hf_token from Client.__init__; both target
    # Spaces are public, so anonymous access is the correct zero-cost route.
    return Client(space, verbose=True, download_files=str(mod.OUT_ROOT / 'downloads'))

mod.client = compatible_client
raise SystemExit(mod.main())
