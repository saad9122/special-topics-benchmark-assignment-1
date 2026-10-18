# Local Ollama LLM Benchmark

## 1. Project objective

This project evaluates how **Temperature, Top-K, and Top-P** affect:

1. Output determinism / variability
2. Factual accuracy and potential hallucination
3. Structural compliance
4. Response length
5. Generation latency and throughput

The recommended local models are:

- `llama3.2:3b`
- `qwen2.5:3b`
- `gemma3:4b`

The experiment is deliberately small enough to run on a laptop with 32 GB RAM.

## 2. Experimental design

### Sampling values

| Parameter | Low | Medium | High |
|---|---:|---:|---:|
| Temperature | 0.2 | 0.7 | 1.2 |
| Top-K | 10 | 40 | 80 |
| Top-P | 0.7 | 0.9 | 1.0 |

### Baseline

When changing one parameter, the other two are held constant:

- Temperature = 0.7
- Top-K = 40
- Top-P = 0.9

### One-factor-at-a-time experiments

Temperature:
- (0.2, 40, 0.9)
- (0.7, 40, 0.9)
- (1.2, 40, 0.9)

Top-K:
- (0.7, 10, 0.9)
- (0.7, 40, 0.9)
- (0.7, 80, 0.9)

Top-P:
- (0.7, 40, 0.7)
- (0.7, 40, 0.9)
- (0.7, 40, 1.0)

This produces **9 configurations per model** and **27 configurations across three models**.

Each configuration is repeated with five different seeds:

`1, 2, 3, 4, 5`

Therefore, the core experiment has:

**27 configurations × 5 repetitions = 135 model generations per prompt.**

The included benchmark contains three prompt categories with 10 prompts total. The complete run therefore produces up to **1,350 generations**.

## 3. Why this design is recommended

Do not begin with all 3 × 3 × 3 = 27 combinations for every analysis question. The one-factor-at-a-time design makes the effect of each parameter easy to explain:

- Temperature changes while Top-K and Top-P remain fixed.
- Top-K changes while Temperature and Top-P remain fixed.
- Top-P changes while Temperature and Top-K remain fixed.

After the core experiment, a small interaction study can be added if time permits.

## 4. Metrics

### Determinism / variability

The same prompt is executed five times using different seeds. TF-IDF cosine similarity is calculated between every pair of responses.

Higher mean pairwise similarity = more consistent output.

Lower mean pairwise similarity = more variable output.

This is a practical proxy for determinism; it is not a perfect measure of semantic equivalence.

### Factual accuracy / hallucination proxy

The factual benchmark contains questions with manually specified acceptable answers.

The script uses normalized exact/substring matching to calculate an automated correctness score.

Important: this is an **automatic factual-error proxy**, not a perfect hallucination detector. For the final report, manually inspect a sample of incorrect answers.

### Structural compliance

The structure prompts require JSON.

The script attempts to parse the generated answer as JSON. If parsing succeeds, the output is structurally valid.

The project intentionally does not use Ollama's forced JSON output mode for this metric, because forcing JSON would artificially improve structural compliance.

### Performance

The script records:

- total generation time
- tokens generated
- tokens/second when available
- response character count
- response word count

## 5. Installation

Install Ollama and make sure it is running.

Pull the models:

```bash
ollama pull llama3.2:3b
ollama pull qwen2.5:3b
ollama pull gemma3:4b
```

Create a Python virtual environment:

```bash
python -m venv .venv
```

Windows:

```bash
.venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

## 6. Run the benchmark

From this directory:

```bash
python benchmark.py
```

Optional arguments:

```bash
python benchmark.py --repetitions 5
python benchmark.py --models llama3.2:3b qwen2.5:3b
python benchmark.py --limit-prompts 3
```

For a quick test before the full experiment:

```bash
python benchmark.py --models llama3.2:3b --repetitions 1 --limit-prompts 1
```

## 7. Analyze the results

After the benchmark completes:

```bash
python analyze.py
```

Outputs are written to:

```text
results/
    raw_results.csv
    summary_by_condition.csv
    model_summary.csv

plots/
    determinism_by_temperature.png
    determinism_by_top_k.png
    determinism_by_top_p.png
    factual_accuracy.png
    structural_compliance.png
    latency.png
```

## 8. Recommended interpretation

Do not assume the hypotheses are true before running the experiment.

Expected hypotheses:

### H1 — Temperature

Higher temperature is expected to increase response variability and reduce consistency.

### H2 — Top-K

Lower Top-K is expected to restrict token choices and increase consistency. Higher Top-K is expected to permit more variation.

### H3 — Top-P

Lower Top-P is expected to produce more focused outputs. Higher Top-P is expected to increase diversity.

### H4 — Factual accuracy

More stochastic sampling may increase factual errors on some tasks, but the effect should be measured rather than assumed.

### H5 — Architecture

Llama, Qwen, and Gemma may respond differently to the same sampling settings.

## 9. Recommended reporting

For the final report, include:

1. Experimental hardware and software
2. Model versions
3. Sampling parameters
4. Prompt dataset
5. Number of repetitions
6. Evaluation metrics
7. Mean and standard deviation
8. Graphs
9. Statistical comparison
10. Discussion of limitations

A particularly useful result is:

> Which sampling configuration gives the best trade-off between consistency, factual accuracy, structural reliability, and generation speed?

## 10. Important limitations

- Automatic factual matching is only a proxy for hallucination.
- TF-IDF similarity does not fully capture semantic similarity.
- Small models can produce different behavior from larger production models.
- Ollama/model versions should be recorded because model updates can change results.
- Hardware utilization can affect latency.
- Sampling parameters interact with one another; the one-factor-at-a-time design is useful for the first stage but does not fully measure interactions.

## 11. Suggested second phase

After the core experiment, select a few interesting configurations and run a small factorial interaction study, for example:

- Temperature: 0.2, 1.2
- Top-K: 10, 80
- Top-P: 0.7, 1.0

This creates 8 combinations per model and can reveal parameter interactions without exploding the experiment size.
