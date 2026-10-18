import os

import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns

from metrics import (
    factual_match,
    json_structure_valid,
    mean_pairwise_tfidf_similarity,
)


INPUT = "results/raw_results.csv"
RESULTS_DIR = "results"
PLOTS_DIR = "plots"


def add_row_metrics(df):
    df = df.copy()

    def parse_answers(x):
        try:
            import json
            return json.loads(x)
        except Exception:
            return []

    df["factual_correct"] = [
        factual_match(response, parse_answers(answers))
        if category == "factual" else None
        for response, answers, category in zip(
            df["response"],
            df["acceptable_answers"],
            df["category"],
        )
    ]

    df["structure_valid"] = [
        json_structure_valid(response)
        if category == "structure" else None
        for response, category in zip(df["response"], df["category"])
    ]

    return df


def summarize(df):
    group_cols = [
        "model",
        "experiment",
        "temperature",
        "top_k",
        "top_p",
    ]

    rows = []

    for keys, group in df.groupby(group_cols, dropna=False):
        model, experiment, temperature, top_k, top_p = keys

        similarity = mean_pairwise_tfidf_similarity(
            group["response"].tolist()
        )

        factual = group["factual_correct"].dropna()
        structural = group["structure_valid"].dropna()

        rows.append({
            "model": model,
            "experiment": experiment,
            "temperature": temperature,
            "top_k": top_k,
            "top_p": top_p,
            "n": len(group),
            "mean_pairwise_similarity": similarity,
            "mean_response_words": group["response_words"].mean(),
            "mean_latency_seconds": group["elapsed_seconds"].mean(),
            "mean_tokens_per_second": group["tokens_per_second"].mean(),
            "factual_accuracy": factual.mean() if len(factual) else None,
            "structural_compliance": (
                structural.mean() if len(structural) else None
            ),
        })

    return pd.DataFrame(rows)


def save_plot(data, x, y, hue, filename, title, ylabel):
    plt.figure(figsize=(10, 6))
    sns.lineplot(
        data=data,
        x=x,
        y=y,
        hue=hue,
        marker="o",
        errorbar="sd",
    )
    plt.title(title)
    plt.xlabel(x)
    plt.ylabel(ylabel)
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, filename), dpi=180)
    plt.close()


def main():
    os.makedirs(RESULTS_DIR, exist_ok=True)
    os.makedirs(PLOTS_DIR, exist_ok=True)

    df = pd.read_csv(INPUT)
    df = add_row_metrics(df)

    summary = summarize(df)

    df.to_csv(
        os.path.join(RESULTS_DIR, "scored_results.csv"),
        index=False,
        encoding="utf-8-sig",
    )

    summary.to_csv(
        os.path.join(RESULTS_DIR, "summary_by_condition.csv"),
        index=False,
        encoding="utf-8-sig",
    )

    model_summary = (
        summary.groupby("model")
        .agg({
            "mean_pairwise_similarity": "mean",
            "mean_response_words": "mean",
            "mean_latency_seconds": "mean",
            "mean_tokens_per_second": "mean",
            "factual_accuracy": "mean",
            "structural_compliance": "mean",
        })
        .reset_index()
    )

    model_summary.to_csv(
        os.path.join(RESULTS_DIR, "model_summary.csv"),
        index=False,
        encoding="utf-8-sig",
    )

    temp = summary[summary["experiment"] == "temperature"]
    topk = summary[summary["experiment"] == "top_k"]
    topp = summary[summary["experiment"] == "top_p"]

    save_plot(
        temp,
        "temperature",
        "mean_pairwise_similarity",
        "model",
        "determinism_by_temperature.png",
        "Output Consistency vs Temperature",
        "Mean pairwise TF-IDF similarity",
    )

    save_plot(
        topk,
        "top_k",
        "mean_pairwise_similarity",
        "model",
        "determinism_by_top_k.png",
        "Output Consistency vs Top-K",
        "Mean pairwise TF-IDF similarity",
    )

    save_plot(
        topp,
        "top_p",
        "mean_pairwise_similarity",
        "model",
        "determinism_by_top_p.png",
        "Output Consistency vs Top-P",
        "Mean pairwise TF-IDF similarity",
    )

    quality = summary.copy()
    quality["factual_accuracy"] = pd.to_numeric(
        quality["factual_accuracy"], errors="coerce"
    )
    quality["structural_compliance"] = pd.to_numeric(
        quality["structural_compliance"], errors="coerce"
    )

    factual = quality.dropna(subset=["factual_accuracy"])
    if not factual.empty:
        plt.figure(figsize=(10, 6))
        sns.barplot(
            data=factual,
            x="temperature",
            y="factual_accuracy",
            hue="model",
            errorbar="sd",
        )
        plt.ylim(0, 1.05)
        plt.title("Factual Accuracy by Temperature")
        plt.ylabel("Factual accuracy")
        plt.tight_layout()
        plt.savefig(
            os.path.join(PLOTS_DIR, "factual_accuracy.png"),
            dpi=180,
        )
        plt.close()

    structural = quality.dropna(subset=["structural_compliance"])
    if not structural.empty:
        plt.figure(figsize=(10, 6))
        sns.barplot(
            data=structural,
            x="temperature",
            y="structural_compliance",
            hue="model",
            errorbar="sd",
        )
        plt.ylim(0, 1.05)
        plt.title("Structural Compliance by Temperature")
        plt.ylabel("Valid JSON proportion")
        plt.tight_layout()
        plt.savefig(
            os.path.join(PLOTS_DIR, "structural_compliance.png"),
            dpi=180,
        )
        plt.close()

    plt.figure(figsize=(10, 6))
    sns.barplot(
        data=summary,
        x="experiment",
        y="mean_latency_seconds",
        hue="model",
        errorbar="sd",
    )
    plt.title("Generation Latency")
    plt.ylabel("Mean seconds")
    plt.tight_layout()
    plt.savefig(
        os.path.join(PLOTS_DIR, "latency.png"),
        dpi=180,
    )
    plt.close()

    print("Analysis complete.")
    print(f"Scored results: {RESULTS_DIR}/scored_results.csv")
    print(f"Summary:        {RESULTS_DIR}/summary_by_condition.csv")
    print(f"Plots:          {PLOTS_DIR}/")


if __name__ == "__main__":
    main()
