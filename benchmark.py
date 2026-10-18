import argparse
import json
import os
import time
from itertools import combinations

import ollama
import pandas as pd
from tqdm import tqdm

from benchmark_config import (
    MODELS,
    TEMPERATURES,
    TOP_K_VALUES,
    TOP_P_VALUES,
    SEEDS,
    MAX_TOKENS,
    OUTPUT_CSV,
    BENCHMARK_FILE,
)


def load_prompts(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def make_conditions():
    """Create the recommended one-factor-at-a-time experiment."""
    conditions = []

    for t in TEMPERATURES:
        conditions.append({
            "experiment": "temperature",
            "temperature": t,
            "top_k": 40,
            "top_p": 0.9,
        })

    for k in TOP_K_VALUES:
        conditions.append({
            "experiment": "top_k",
            "temperature": 0.7,
            "top_k": k,
            "top_p": 0.9,
        })

    for p in TOP_P_VALUES:
        conditions.append({
            "experiment": "top_p",
            "temperature": 0.7,
            "top_k": 40,
            "top_p": p,
        })

    # Remove duplicate baseline (0.7, 40, 0.9), keeping its first occurrence.
    unique = {}
    for c in conditions:
        key = (c["temperature"], c["top_k"], c["top_p"])
        unique[key] = c

    return list(unique.values())


def run_one(model, prompt_record, condition, seed):
    options = {
        "temperature": condition["temperature"],
        "top_k": condition["top_k"],
        "top_p": condition["top_p"],
        "seed": seed,
        "num_predict": MAX_TOKENS,
    }

    start = time.perf_counter()

    response = ollama.chat(
        model=model,
        messages=[{"role": "user", "content": prompt_record["prompt"]}],
        options=options,
    )

    elapsed = time.perf_counter() - start

    message = response.get("message", {})
    text = message.get("content", "") or ""
    stats = response

    eval_count = stats.get("eval_count")
    eval_duration_ns = stats.get("eval_duration")
    tokens_per_second = None

    if eval_count and eval_duration_ns:
        tokens_per_second = eval_count / (eval_duration_ns / 1e9)

    return {
        "model": model,
        "prompt_id": prompt_record["id"],
        "category": prompt_record["category"],
        "prompt": prompt_record["prompt"],
        "experiment": condition["experiment"],
        "temperature": condition["temperature"],
        "top_k": condition["top_k"],
        "top_p": condition["top_p"],
        "seed": seed,
        "response": text,
        "elapsed_seconds": elapsed,
        "eval_count": eval_count,
        "tokens_per_second": tokens_per_second,
        "response_chars": len(text),
        "response_words": len(text.split()),
        "acceptable_answers": json.dumps(
            prompt_record.get("acceptable_answers", []),
            ensure_ascii=False,
        ),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--models", nargs="+", default=MODELS)
    parser.add_argument("--repetitions", type=int, default=len(SEEDS))
    parser.add_argument("--limit-prompts", type=int, default=None)
    parser.add_argument("--output", default=OUTPUT_CSV)
    args = parser.parse_args()

    prompts = load_prompts(BENCHMARK_FILE)
    if args.limit_prompts:
        prompts = prompts[:args.limit_prompts]

    seeds = SEEDS[:args.repetitions]
    conditions = make_conditions()

    total = len(args.models) * len(prompts) * len(conditions) * len(seeds)
    print(f"Models: {args.models}")
    print(f"Prompts: {len(prompts)}")
    print(f"Conditions/model: {len(conditions)}")
    print(f"Seeds/condition: {len(seeds)}")
    print(f"Total generations: {total}")

    os.makedirs(os.path.dirname(args.output), exist_ok=True)

    rows = []
    progress = tqdm(total=total, desc="Running benchmark")

    for model in args.models:
        for prompt_record in prompts:
            for condition in conditions:
                for seed in seeds:
                    try:
                        row = run_one(model, prompt_record, condition, seed)
                        rows.append(row)
                    except Exception as exc:
                        rows.append({
                            "model": model,
                            "prompt_id": prompt_record["id"],
                            "category": prompt_record["category"],
                            "prompt": prompt_record["prompt"],
                            "experiment": condition["experiment"],
                            "temperature": condition["temperature"],
                            "top_k": condition["top_k"],
                            "top_p": condition["top_p"],
                            "seed": seed,
                            "response": "",
                            "elapsed_seconds": None,
                            "eval_count": None,
                            "tokens_per_second": None,
                            "response_chars": 0,
                            "response_words": 0,
                            "acceptable_answers": json.dumps(
                                prompt_record.get("acceptable_answers", [])
                            ),
                            "error": repr(exc),
                        })
                    progress.update(1)

    progress.close()
    df = pd.DataFrame(rows)
    df.to_csv(args.output, index=False, encoding="utf-8-sig")

    print(f"\nSaved {len(df)} rows to {args.output}")


if __name__ == "__main__":
    main()
