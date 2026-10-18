# Experimental Methodology

## Research question

How do Temperature, Top-K, and Top-P sampling parameters affect output determinism, factual accuracy, structural compliance, and generation performance across different local LLM architectures?

## Models

- Llama 3.2 3B
- Qwen 2.5 3B
- Gemma 3 4B

These models were selected to keep local inference practical on a 32 GB RAM laptop while allowing cross-architecture comparison.

## Independent variables

### Temperature
0.2, 0.7, 1.2

### Top-K
10, 40, 80

### Top-P
0.7, 0.9, 1.0

## Controlled baseline

Temperature = 0.7  
Top-K = 40  
Top-P = 0.9

## Experimental strategy

A one-factor-at-a-time strategy is used in the first phase. Only one sampling parameter changes at a time, while the remaining parameters are held at the baseline.

This produces nine unique conditions per model.

Each condition is repeated five times using seeds 1–5.

## Dependent variables

### 1. Output determinism

Mean pairwise TF-IDF cosine similarity among the five responses.

Higher value means greater textual consistency.

### 2. Factual accuracy

For factual prompts, responses are compared with a manually defined set of acceptable answers.

The resulting score is an automated factual-error proxy. It should be supplemented by manual inspection.

### 3. Structural compliance

For structure prompts, the response is parsed as JSON.

Valid JSON is counted as structurally compliant.

### 4. Performance

The experiment records:

- latency
- generated token count
- tokens per second
- response length

## Expected hypotheses

1. Increasing temperature will generally increase output variability.
2. Lower Top-K will generally produce more restricted output.
3. Lower Top-P will generally produce more focused output.
4. Higher sampling diversity may increase factual errors on some tasks.
5. Models will differ in their sensitivity to the same sampling settings.

These are hypotheses, not conclusions.

## Reproducibility

For every generation, record:

- model name
- prompt ID
- Temperature
- Top-K
- Top-P
- random seed
- model response
- latency
- token statistics
- software/model versions where possible

## Limitations

The automatic factual metric is intentionally simple and cannot detect every hallucination. TF-IDF similarity measures lexical overlap and does not fully represent semantic similarity. The one-factor-at-a-time design does not fully capture interactions between sampling parameters. A second-stage factorial experiment can be added after the main benchmark.
