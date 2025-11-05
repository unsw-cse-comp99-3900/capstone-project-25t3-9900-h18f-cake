# tests/test_dnn_standalone.py
# -*- coding: utf-8 -*-
"""
Standalone sanity test for the DNN prior:
- Ensure a rubric exists (or create a 3-dim fallback)
- Load a real JSONL training set if present; otherwise synthesize one
- Train the prior for several epochs, save, reload and predict
"""

import os
import json
import random
import numpy as np
from pathlib import Path
import sys

# Make project importable when running as a script
sys.path.append(".")

# Reproducibility (optional)
try:
    import torch
    torch.manual_seed(42)
except Exception:
    pass
random.seed(42)
np.random.seed(42)

from app.dnn_prior import PriorEstimator
from app.storage import load_json
from config import PRIOR_MODEL_PATH

# -------------------------------------
# 0) Paths
# -------------------------------------
ROOT = Path(".").resolve()
SAMPLES = ROOT / "samples"
ARTI = ROOT / "artifacts"
RUBRIC_PATH = SAMPLES / "rubric_CVEN9723.json"
TRAIN_JSONL = SAMPLES / "train_prior.jsonl"

SAMPLES.mkdir(parents=True, exist_ok=True)
ARTI.mkdir(parents=True, exist_ok=True)

# -------------------------------------
# 1) Ensure rubric exists (fallback 3 dims, 30 total)
# -------------------------------------
if not RUBRIC_PATH.exists():
    fallback = {
        "dimensions": [
            {"dim_id": "tech",  "name": "Technical contents",         "max_score": 20},
            {"dim_id": "req",   "name": "Requirements",               "max_score": 5},
            {"dim_id": "write", "name": "Writing & referencing",      "max_score": 5}
        ]
    }
    RUBRIC_PATH.write_text(json.dumps(fallback, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[info] wrote fallback rubric -> {RUBRIC_PATH}")

rubric = load_json(str(RUBRIC_PATH))
dim_order = [d["dim_id"] for d in rubric["dimensions"]]
max_map = {d["dim_id"]: float(d["max_score"]) for d in rubric["dimensions"]}
print(f"[info] rubric dims: {dim_order} (max: {max_map})")

# -------------------------------------
# 2) Load training data or synthesize N samples
#    Each line: {"dim_texts": {...}, "scores": {...}}
# -------------------------------------
def _default_ratio_range(dim_name: str):
    name = dim_name.lower()
    if "tech" in name or "content" in name:   # technical
        return 0.70, 0.90
    if "req" in name or "require" in name:    # requirements
        return 0.70, 1.00
    if "write" in name or "referenc" in name or "language" in name:  # writing
        return 0.60, 1.00
    return 0.65, 0.95

def _synth_one(rub):
    dim_texts, scores = {}, {}
    for d in rub["dimensions"]:
        did, name, mx = d["dim_id"], d["name"], float(d["max_score"])
        # simple academic snippets
        if "tech" in did or "content" in did:
            txt = "Analyzes relationships; benchmarks local vs international practice; evidence-based recommendations."
        elif "req" in did or "require" in did:
            txt = "Complies with cover sheet, page limit, professional layout, correct font and spacing."
        else:
            txt = "Clear academic English; captions for figures/tables; consistent in-text citations; Harvard references."
        lo, hi = _default_ratio_range(name)
        ratio = max(0.0, min(1.0, random.uniform(lo, hi) + random.uniform(-0.05, 0.05)))
        dim_texts[did] = txt
        scores[did] = round(ratio * mx, 2)
    return {"dim_texts": dim_texts, "scores": scores}

if TRAIN_JSONL.exists():
    train = [json.loads(l) for l in TRAIN_JSONL.read_text(encoding="utf-8").splitlines() if l.strip()]
    print(f"[info] loaded training set: {TRAIN_JSONL} (n={len(train)})")
else:
    # synthesize 120 samples if no JSONL is present
    train = [_synth_one(rubric) for _ in range(120)]
    TRAIN_JSONL.write_text("\n".join(json.dumps(x, ensure_ascii=False) for x in train), encoding="utf-8")
    print(f"[info] synthesized training set -> {TRAIN_JSONL} (n={len(train)})")

# -------------------------------------
# 3) Remove old model to avoid stale weights
# -------------------------------------
try:
    Path(PRIOR_MODEL_PATH).unlink()
    print(f"[info] removed old model: {PRIOR_MODEL_PATH}")
except FileNotFoundError:
    pass

# -------------------------------------
# 4) Train
# -------------------------------------
pe = PriorEstimator(num_dims=len(dim_order))
pe.fit(train, dim_order, lr=1e-3, epochs=50)   # 50 epochs for stability
print(f"[ok] trained & saved to: {PRIOR_MODEL_PATH}")

# -------------------------------------
# 5) Predict
# -------------------------------------
test_dim_texts = [f"student content for {d}" for d in dim_order]
mu, sigma = pe.predict(test_dim_texts)
print("mu:", np.round(mu, 3))
print("sigma:", np.round(sigma, 3))

# sanity checks (loose bounds)
assert mu.shape[0] == len(dim_order)
assert sigma.shape[0] == len(dim_order)
for i, d in enumerate(dim_order):
    assert -10.0 <= mu[i] <= max_map[d] + 10.0

# -------------------------------------
# 6) Reload & predict again
# -------------------------------------
pe2 = PriorEstimator(num_dims=len(dim_order))
pe2.load()
mu2, sigma2 = pe2.predict(test_dim_texts)
print("mu(reloaded):", np.round(mu2, 3))
print("sigma(reloaded):", np.round(sigma2, 3))

print("DNN prior standalone test OK")
