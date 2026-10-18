# Results

Model: **`llama3.2:3b`** (Meta Llama 3.2 3B Instruct, Q4_K_M, via Ollama)
Run: 13 conditions × 18 prompts × 5 seeds = **1,170 generations**
Hardware: Intel Core Ultra 7 255H, 32 GB RAM. Total run time about 40 minutes.

---

## 1. The short version

| Question | Answer from this run |
|---|---|
| Which setting controls repeatability most? | **Temperature**, closely followed by **Top-P**. |
| Does Top-K matter? | Only at **Top-K = 1**. Between 10 and 100 it changes nothing. |
| Does randomness cause hallucination? | **Yes.** 0% invented answers with randomness off, 10-15% with it on. |
| Does randomness cause factual errors? | **Almost never.** The model refuses rather than guessing wrong. |
| Does randomness break JSON formatting? | **Only at Top-P = 1.0** (87% valid instead of 100%). |
| Does randomness cost speed? | Slightly: 1.84 s to 2.07 s per answer at the extremes. |

**The safe setting for this model:** Temperature 0.0-0.3, Top-K 40, Top-P 0.3-0.7.

**The risky setting:** Temperature 1.5 with Top-P 1.0.

---

## 2. Main results table

All values are averages over 18 prompts × 5 repeats. One setting varies per
block; the other two stay at the baseline (Temp 0.7, Top-K 40, Top-P 0.9).

### Temperature

| Temp | Determinism | Identical repeats | Factual accuracy | Hallucination | Valid JSON | Words | Seconds |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.0 | **0.96** | **96%** | 0.98 | **0.00** | 1.00 | 30.1 | 1.93 |
| 0.3 | 0.67 | 46% | 0.93 | 0.10 | 1.00 | 31.3 | 1.92 |
| 0.7 | 0.58 | 36% | 0.93 | 0.15 | 1.00 | 30.9 | 1.93 |
| 1.0 | 0.55 | 30% | 0.96 | 0.15 | 1.00 | 31.6 | 1.96 |
| 1.5 | **0.52** | **29%** | 0.98 | 0.10 | 1.00 | 33.8 | 2.07 |

### Top-K

| Top-K | Determinism | Identical repeats | Factual accuracy | Hallucination | Valid JSON | Words | Seconds |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | **1.00** | **100%** | 1.00 | **0.00** | 1.00 | 30.1 | 1.89 |
| 10 | 0.59 | 36% | 0.93 | 0.15 | 1.00 | 30.5 | 1.91 |
| 40 | 0.58 | 36% | 0.93 | 0.15 | 1.00 | 30.9 | 1.92 |
| 100 | 0.58 | 36% | 0.93 | 0.15 | 1.00 | 31.1 | 1.93 |

### Top-P

| Top-P | Determinism | Identical repeats | Factual accuracy | Hallucination | Valid JSON | Words | Seconds |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.3 | **0.96** | **96%** | 1.00 | **0.00** | 1.00 | 28.6 | 1.84 |
| 0.7 | 0.66 | 46% | 0.93 | 0.10 | 1.00 | 30.7 | 1.92 |
| 0.9 | 0.58 | 36% | 0.93 | 0.15 | 1.00 | 30.9 | 1.91 |
| 1.0 | **0.54** | **33%** | 0.89 | 0.15 | **0.87** | 32.4 | 1.99 |

Full data: `results/summary_by_condition.csv`.

---

## 3. What each result means

### 3.1 Determinism: the clearest effect in the whole study

Determinism is the share of wording that repeats when the same question is
asked 5 times. 1.00 means the 5 answers were word-for-word identical.

**Temperature 0.0 gives 0.96 similarity and 96% identical answers.
Temperature 1.5 gives 0.52 and 29%.**

So turning the temperature up roughly halves repeatability. Most of the drop
happens immediately, between 0.0 and 0.3 (0.96 down to 0.67). After that the
curve flattens: going from 1.0 to 1.5 costs very little extra.

**Practical reading:** if you need reproducible output, the only value that
really matters is **Temperature 0.0**. Temperature 0.3 is already most of the
way to being as random as 1.5.

Determinism at 0.0 is 0.96 rather than exactly 1.00 because GPU arithmetic is
not bit-for-bit reproducible, so a few answers still differ slightly even with
randomness switched off.

### 3.2 Top-K only has one useful value: 1

**Top-K = 1 gives perfect determinism (1.00, 100% identical). Top-K 10, 40 and
100 are indistinguishable from each other (all 0.58).**

This looks odd but has a simple explanation. Top-K = 1 is greedy decoding: the
model must take the single most likely word, so no randomness is left. Above
that, the baseline Top-P of 0.9 has *already* cut the candidate list down to
far fewer than 10 words, so raising the limit from 10 to 100 changes nothing —
the extra slots are never used.

**Practical reading:** on this model Top-K is a blunt on/off switch, not a
dial. Tune Temperature and Top-P instead.

### 3.3 Hallucination: randomness is what allows it

The 4 trap prompts ask about things that do not exist (a fake city, a fake
research paper, a fake theorem, and a prize not yet awarded). The correct
behaviour is to say so. "Hallucination" is the share of answers that invented
something instead.

**Every setting with randomness switched off scored 0.00 — Temperature 0.0,
Top-K 1, and Top-P 0.3. Every setting with randomness on scored 0.10-0.15.**

This is the cleanest hallucination result in the run, and it points one way:
randomness does not create false knowledge, but it does let the model drift
off its safest answer onto a plausible-sounding invention.

Prompt by prompt, almost all of the signal comes from **one trap**: the fake
"Kessler-Brandt theorem", which the model invented a definition for in 42% of
all attempts — 0% at Temperature 0.0, rising to 60% at Temperature 0.7-1.0.
The other three traps were refused every single time, at every setting. A
fake-sounding *technical* term is far more dangerous than a fake city or a
future prize.

### 3.4 Factual accuracy: barely moves, and that is the real finding

Factual accuracy stayed between 0.89 and 1.00 at every setting, with no trend.

The reason becomes visible once refusals are counted separately from errors:

| Outcome on factual prompts | Rate |
|---|---|
| Correct | 89-100% |
| **Confidently wrong** | **0.0-2.2%** |
| Refused to answer | 4-11% |

**The model essentially never states a wrong fact. When it is unsure, it
refuses.** The refusal rate is actually *highest* at Temperature 0.0 (11%) and
lowest at Temperature 1.5 (4.4%) — raising the temperature makes the model more
willing to commit to an answer, not more likely to be wrong.

Nearly all refusals come from one prompt: the discovery of francium, where the
model answers "I can't verify who discovered francium" in two thirds of
attempts, often while still giving the correct year.

**Practical reading:** for short factual questions, sampling settings are not
the lever that controls accuracy on this model. Its knowledge is the limit, and
it is well calibrated about where that knowledge ends.

### 3.5 Structure: only Top-P 1.0 breaks it

JSON compliance is scored strictly here: the output must parse *and* have
exactly the 6 requested keys, including a nested object and a list.

**12 of the 13 conditions scored a perfect 1.00. Only Top-P = 1.0 dropped, to
0.87.**

Both failures were answers that stopped generating partway through the JSON
object, leaving it unclosed. At Top-P = 1.0 no words are filtered out at all,
so the model has a small chance of picking an end-of-text token early.

**Practical reading:** Top-P = 1.0 is the one setting to avoid when the output
must be machine-readable. Anything from 0.3 to 0.9 was flawless.

### 3.6 Speed and length

Higher randomness makes answers slightly longer and slightly slower: 28.6 words
in 1.84 s at Top-P 0.3, against 33.8 words in 2.07 s at Temperature 1.5.
Throughput stayed flat at about 25 tokens per second throughout, so the extra
time is simply the extra words, not slower generation.

---

## 4. Were the hypotheses right?

| # | Hypothesis | Result |
|---|---|---|
| 1 | Determinism falls as Temperature rises | **Confirmed.** 0.96 down to 0.52 |
| 2 | Top-K = 1 is effectively greedy | **Confirmed.** Exactly 1.00 |
| 3 | Lower Top-P raises determinism | **Confirmed.** 0.54 at 1.0, 0.96 at 0.3 |
| 4 | Hallucination rises with Temperature | **Partly confirmed.** 0.00 to 0.15, but it peaks at 0.7-1.0 rather than rising all the way to 1.5 |
| 5 | JSON compliance falls at high Temperature and Top-P | **Half confirmed.** Temperature had no effect at all; only Top-P 1.0 broke it |
| 6 | Temperature has the largest effect, Top-P the smallest | **Rejected.** Temperature and Top-P are about equally strong; **Top-K** is the one that barely matters |

Two hypotheses being wrong is a result, not a problem. The structure finding —
Temperature does not break JSON, Top-P 1.0 does — is the most practically
useful thing in this report.

---

## 5. Recommended settings for `llama3.2:3b`

| If you want... | Temperature | Top-K | Top-P |
|---|---|---|---|
| Reproducible output (tests, grading, pipelines) | 0.0 | 1 | 0.3 |
| Reliable JSON / structured extraction | 0.0-0.3 | 40 | 0.7-0.9 |
| Factual question answering | 0.0-0.3 | 40 | 0.7 |
| Varied, natural-sounding text | 0.7-1.0 | 40 | 0.9 |
| Nothing — avoid this combination | 1.5 | any | 1.0 |

---

## 6. How to re-check any number here

Every number above comes from `results/summary_by_condition.csv`, produced by
`python analyze.py` from `results/raw_results.csv`. Every individual answer the
model gave is stored in `results/scored_results.csv` with its settings, seed and
scores, so any claim can be traced back to the raw text.

Scoring is done from `benchmark_prompts.json` at analysis time, so if an
accepted answer needs correcting, edit that file and re-run `python analyze.py`
— the models do not need to run again.

---

## 7. Caveats on these numbers

- **One model, one run.** The whole experiment was not repeated, so small
  differences (anything under about 0.05) should not be treated as real.
- **The hallucination result rests on 4 prompts**, and 1 of them produces
  nearly all of the signal. The direction is clear; the exact percentages are
  not precise.
- **Determinism is measured on wording, not meaning.** Two answers that say the
  same thing in different words score low.
- **Refusals are detected by phrase matching.** Spot-checks were done by hand,
  but an unusual wording could be miscounted.
