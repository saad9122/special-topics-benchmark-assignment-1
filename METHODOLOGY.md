# Experimental Methodology

## Research question

How do Temperature, Top-K and Top-P affect the output determinism, factual
accuracy, hallucination rate and structural compliance of **Meta Llama 3.2 3B
Instruct (`llama3.2:3b`)** running locally through Ollama?

## Model under test

A single model is used: **`llama3.2:3b`** (Meta Llama 3.2 3B Instruct,
Q4_K_M quantisation, `family: llama`, 3.2 B parameters), served locally by
Ollama.

Using one model removes model choice as a confounding variable: every
difference observed in the results is attributable to the sampling settings.

### Parameter values accepted by this model

`ollama show llama3.2:3b` reports no sampling parameters in the model's own
Modelfile (only stop tokens), so the model inherits Ollama's defaults and
Ollama's accepted value ranges.

| Setting | Type | Accepted by Ollama | Ollama default | Meta reference | Sensible range |
|---|---|---|---|---|---|
| `temperature` | float | >= 0.0, no enforced upper bound | 0.8 | 0.6 | 0.0 - 1.5 (beyond ~2.0 output degrades into noise) |
| `top_k` | int | >= 0, where 0 disables Top-K | 40 | not set | 1 - 100 (1 = greedy decoding) |
| `top_p` | float | 0.0 - 1.0 | 0.9 | 0.9 | 0.1 - 1.0 (1.0 = no nucleus filtering) |
| `seed` | int | any integer, 0 = random | 0 | - | 1 - 5 fixed, for repeatability |
| `num_predict` | int | token cap, -1 = unlimited | 128 | - | 256 used here |

Ollama performs no validation of these values: out-of-range settings are
accepted and simply produce degraded output. The levels chosen below therefore
sit within the sensible ranges and deliberately include both endpoints of each.

## Independent variables

| Variable | Levels |
|---|---|
| Temperature | 0.0, 0.3, 0.7, 1.0, 1.5 |
| Top-K | 1, 10, 40, 100 |
| Top-P | 0.3, 0.7, 0.9, 1.0 |

All levels are valid Ollama values for this model. The ranges include both
extremes - fully greedy (Temperature 0.0, Top-K 1) and highly random
(Temperature 1.5, Top-P 1.0) - so that any effect is large enough to see
without statistical rescue.

## Controlled baseline

Temperature = 0.7, Top-K = 40, Top-P = 0.9.

Top-K and Top-P are Ollama's defaults for this model. Temperature 0.7 sits
between Meta's reference value (0.6) and Ollama's default (0.8).

## Design

One-factor-at-a-time. One setting is varied while the other two are held at
baseline, giving 13 conditions.

Each condition is run on all 18 prompts, with 5 fixed seeds (1-5) per prompt.

Total: 13 conditions × 18 prompts × 5 seeds = 1,170 generations.

## Prompt set

| Group | Count | Purpose |
|---|---|---|
| Easy factual | 3 | Control; should stay correct at every setting |
| Hard factual | 6 | Facts at the edge of a 3B model's knowledge, where randomness can flip the answer |
| Trap (non-existent entities) | 4 | Detects hallucination: the only correct behaviour is to say the thing does not exist |
| Strict JSON | 3 | Six exact keys including a list and a nested object; no prose, no fences |
| Open-ended | 2 | Shows drift in length and wording |

Trap prompts are phrased as though the entity were real and contain no
invitation to abstain. In a pilot run, traps that ended with "if you do not
know, say so" produced a 0.0 hallucination rate at every setting, which
measures the hint rather than the model.

The split into easy and hard factual prompts is deliberate: if every prompt is
easy, accuracy is 1.0 everywhere and the experiment measures nothing.

## Dependent variables

### 1. Determinism

For each (condition, **prompt**) pair, the mean pairwise TF-IDF cosine
similarity across the 5 seeded repeats, plus the share of repeats that are
word-for-word identical.

The similarity must be computed **within a single prompt**. Pooling the
responses of different prompts measures how different the questions were, not
how deterministic the model is.

### 2. Factual accuracy

For factual prompts, 1 if any accepted answer string appears in the normalised
response. An automated proxy, to be spot-checked by hand.

### 3. Hallucination rate

For trap prompts, 1 if the model produced a confident answer about a thing that
does not exist, 0 if it abstained. Abstention is detected from a list of
phrases such as "does not exist", "I could not find", "I do not know".

### 4. Structural compliance

For JSON prompts, 1 only if a JSON object can be parsed **and** its key set
matches the requested keys exactly. A second, stricter measure records whether
the raw response was pure JSON with no surrounding text.

### 5. Performance

Latency, generated token count, tokens per second, response length.

## Hypotheses

1. Determinism falls as Temperature rises; Temperature 0.0 is near-identical output.
2. Top-K = 1 is effectively greedy and therefore highly deterministic.
3. Lower Top-P narrows the candidate set and raises determinism.
4. Hallucination on trap prompts rises with Temperature.
5. Strict JSON compliance falls at high Temperature and high Top-P.
6. Temperature is the setting with the largest overall effect; Top-P has the smallest, because at the baseline Top-K already restricts the candidate set.

## Reproducibility

Each row records the model tag, prompt ID, category, difficulty, Temperature, Top-K,
Top-P, seed, full response, latency and token statistics. Re-running
`benchmark.py` with the same config reproduces the run.

## Limitations

TF-IDF similarity captures wording, not meaning. Keyword-based factual scoring
cannot catch every subtle error. Phrase-based abstention detection can
mislabel an unusual refusal. The one-factor-at-a-time design does not capture
interactions between the three settings; a factorial follow-up would. Results
describe `llama3.2:3b` only and should not be generalised to other
architectures or model sizes without repeating the experiment.
