# Local LLM Benchmark: how Temperature, Top-K and Top-P change the behaviour of **llama3.2:3b**

A small, reproducible experiment that runs **one local model — Meta's
Llama 3.2 3B Instruct (`llama3.2:3b`) — through Ollama** and measures what
happens to its answers when the three sampling settings change.

Everything runs offline on a laptop. No API keys, no cloud, no cost.

---

## 1. The question in one line

**For `llama3.2:3b`, if I change Temperature, Top-K or Top-P, what happens to
how repeatable, how truthful, and how well-formatted its answers are?**

## 2. What is measured

| What we measure | Plain meaning | How it is scored | Good value |
|---|---|---|---|
| **Determinism** | Ask the same question 5 times — are the answers the same? | Average word-overlap (TF-IDF cosine) between the 5 answers | 1.0 = identical |
| **Factual accuracy** | Does the answer contain the correct fact? | The known correct answer is searched for in the text | 1.0 = always right |
| **Confidently wrong** | Did it state a wrong fact, as opposed to refusing? | Not correct, and no refusal wording present | 0.0 = never |
| **Hallucination rate** | Asked about something that does not exist, does the model invent an answer? | 1 if it invented something, 0 if it said "I don't know" | 0.0 = never invents |
| **Structure compliance** | Asked for JSON with exact keys, does it comply? | Parsed as JSON and the key set must match exactly | 1.0 = always valid |
| **Speed** | How fast it answers | Seconds per answer, tokens per second | higher tok/s is better |

## 3. Model used

Everything in this project is measured on **one model**:

| | |
|---|---|
| **Ollama tag** | `llama3.2:3b` |
| **Full name** | Meta Llama 3.2 3B Instruct |
| **Architecture family** | Llama (reported by Ollama as `family: llama`) |
| **Parameters** | 3.2 B |
| **Quantisation** | Q4_K_M |
| **Download size** | about 2 GB |
| **Runs on** | Intel Core Ultra 7 255H, 32 GB RAM — roughly 1-4 seconds per answer |

Only one model is used, so every difference in the results comes from the
sampling settings, not from switching models.

## 4. Settings tested

One setting is changed at a time. The other two stay at the baseline
(Temperature 0.7, Top-K 40, Top-P 0.9).

### 4.1 Allowed values for `llama3.2:3b` in Ollama

`llama3.2:3b` ships with **no sampling parameters of its own** — `ollama show
llama3.2:3b` lists only stop tokens — so it uses Ollama's own defaults, and
Ollama's accepted value ranges apply unchanged.

| Setting | Type | Accepted by Ollama | Ollama default | Meta's reference value | Useful range in practice |
|---|---|---|---|---|---|
| `temperature` | float | 0.0 and above; no hard upper limit is enforced | **0.8** | **0.6** | 0.0 - 1.5. Above about 2.0 the text becomes incoherent, so it is not worth testing. |
| `top_k` | integer | 0 and above; `0` turns Top-K off | **40** | not set | 1 - 100. `top_k = 1` is greedy decoding (always the single most likely word). |
| `top_p` | float | 0.0 to 1.0 | **0.9** | **0.9** | 0.1 - 1.0. `top_p = 1.0` keeps every word, i.e. no nucleus filtering. |
| `seed` | integer | any integer; `0` means random | 0 | - | fixed values 1-5 are used here so runs can be repeated |
| `num_predict` | integer | token cap; `-1` = unlimited | 128 | - | 256 is used here, enough for these short answers |

Two things worth knowing, because the experiment is built around them:

- **Ollama does not reject out-of-range values.** It will accept
  `temperature 5.0` and simply produce nonsense. The ranges above are the
  *sensible* ranges, not enforced limits.
- **Temperature 0.0 and Top-K 1 both mean "no randomness".** They are included
  on purpose as the anchor points of each curve: at those values the model
  should repeat itself almost word for word.

The values tested below sit inside these ranges and include both ends of each
one, so the full effect of each setting is visible.

| Setting | Values tested | What it does, in plain words |
|---|---|---|
| Temperature | 0.0, 0.3, 0.7, 1.0, 1.5 | How much randomness is allowed. 0 = always pick the most likely word. |
| Top-K | 1, 10, 40, 100 | How many candidate words the model may choose from. K=1 means only the best one. |
| Top-P | 0.3, 0.7, 0.9, 1.0 | Keep only the most likely words that add up to this probability mass. |

13 conditions × 18 prompts × 5 seeds = **1,170 generations**, all on `llama3.2:3b`.

## 5. The prompt set

18 prompts in four groups, chosen so the effects actually show up:

- **3 easy facts** (Tokyo, Jane Austen, Mars) — a control; these should stay
  correct at every setting.
- **6 hard facts** (francium's discovery, the first UN Secretary-General, the
  author of *The Leopard*, element 42, Russia's time zones, the deepest lake)
  — facts at the edge of what a 3B model reliably knows, so randomness has
  something to break.
- **4 trap prompts** about things that do not exist — a fake city, a fake
  research paper, a prize not yet awarded, and a fake theorem. These are
  written as if the thing were real, with **no** "say so if you don't know"
  hint, so the model is under pressure to invent something.
- **3 strict JSON prompts** — six exact keys, including a list and a nested
  object, no markdown fences, no prose.
- **2 open-ended prompts** — to see how length and wording drift.

The difficulty here is deliberate. An earlier version of this prompt set used
easy facts, simple JSON and traps that openly invited the model to say "I don't
know". Every one of those scored the same at every setting, so the experiment
measured nothing.

## 6. How to run it

```bash
ollama pull llama3.2:3b

pip install -r requirements.txt

python benchmark.py     # runs the models, writes results/raw_results.csv
python analyze.py       # scores everything, writes tables and plots
```

Quick trial first (about one minute):

```bash
python benchmark.py --limit-prompts 3 --repetitions 2
```

## 7. What you get

| File | What is inside |
|---|---|
| `results/raw_results.csv` | Every single answer, with its settings, seed and timing |
| `results/scored_results.csv` | The same rows plus the correct/hallucinated/valid-JSON scores |
| `results/summary_by_condition.csv` | **The main table** — one row per setting value |
| `results/headline_table.csv` | The same table trimmed to the five headline numbers |
| `results/model_summary.csv` | A single averaged row for `llama3.2:3b` |
| `plots/determinism_by_*.png` | Repeatability vs each setting |
| `plots/hallucination_by_*.png` | Invented answers vs each setting |
| `plots/structure_by_*.png` | Valid JSON vs each setting |
| `plots/factual_accuracy_by_*.png`, `factual_errors_by_*.png` | Correct and wrong answers vs each setting |
| `plots/latency_by_temperature.png` | Speed vs temperature |

## 8. How to read the results

**The findings themselves are written up in plain language in
[`RESULTS.md`](RESULTS.md) — start there.** This section explains how to read
the charts for yourself.

Start with `plots/determinism_by_temperature.png`.

- The **x-axis** is the setting value and the **y-axis** is the score.
  There is one line, because there is one model.
- For determinism, **high on the left and falling to the right** is the
  expected shape: low temperature repeats itself, high temperature does not.
- For hallucination, **the line going up** means higher randomness makes the
  model invent more.
- Comparing the three charts for the same score shows which of the three
  settings `llama3.2:3b` is most sensitive to.

### The headline result from this run

| Setting | Determinism at its lowest value | at its highest value |
|---|---|---|
| Temperature 0.0 vs 1.5 | 0.96 | 0.52 |
| Top-K 1 vs 100 | 1.00 | 0.58 |
| Top-P 0.3 vs 1.0 | 0.96 | 0.54 |

Hallucination on the trap prompts was **0.00 at Temperature 0.0, Top-K 1 and
Top-P 0.3**, and 0.10-0.15 everywhere else. JSON was perfect everywhere except
Top-P = 1.0.

See [`RESULTS.md`](RESULTS.md) for the full explanation of every number.

## 9. The interactive dashboard

A Next.js dashboard renders the same results in the browser, with two sections:

1. **The effect of each setting** — pick a measurement (determinism,
   hallucination, accuracy, valid JSON, latency, length) and see it plotted
   against Temperature, Top-K and Top-P side by side. A table view shows every
   number at once.
2. **Explore what the model actually said** — pick any of the 18 questions and
   any setting, and read all five repeats at every value of that setting, with
   the correct / wrong / refused / hallucinated score on each answer.

### Running it

```bash
python analyze.py                 # make sure the results are up to date
python export_dashboard_data.py   # CSV -> dashboard/public/data/*.json

cd dashboard
npm install
npm run dev                       # http://localhost:3000
```

`export_dashboard_data.py` is the only link between the two halves of the
project: it reads the CSVs in `results/` and writes the JSON the dashboard
loads. Re-run the benchmark, re-run the export, and the dashboard updates.

### Good things to try in the explorer

- Pick the **Kessler-Brandt theorem** trap question and sweep Temperature. At
  0.0 the model says it cannot find the theorem; from 0.3 upward it starts
  inventing definitions and mathematicians who never existed.
- Pick any easy factual question and sweep **Top-K**. At K = 1 all five repeats
  are identical; at K = 10 and above they are not.
- Pick a **JSON** question and set the sweep to Top-P to see the unfinished
  object at Top-P 1.0.

## 10. Project files

| File | Purpose |
|---|---|
| `benchmark_config.py` | All settings in one place: models, values, seeds |
| `benchmark_prompts.json` | The 15 prompts and their correct answers |
| `benchmark.py` | Runs the models and saves raw answers |
| `metrics.py` | The scoring functions |
| `analyze.py` | Scores, summarises and plots |
| `METHODOLOGY.md` | The formal experimental design |
| `RESULTS.md` | **The findings in plain language — read this for the results** |
| `export_dashboard_data.py` | Turns the CSVs into JSON for the dashboard |
| `dashboard/` | The Next.js dashboard (see section 9) |

## 11. Libraries used

| Library | Used for |
|---|---|
| `ollama` | Running `llama3.2:3b` locally |
| `pandas` | Tables and grouping |
| `numpy` / `scipy` | Averages and basic statistics |
| `scikit-learn` | TF-IDF similarity between repeated answers |
| `matplotlib` / `seaborn` | Plots |
| `tqdm` | Progress bar |

And for the dashboard:

| Library | Used for |
|---|---|
| `next` / `react` | The dashboard app |
| `recharts` | The interactive charts |
| `typescript` | Type safety across the dashboard code |

## 12. Honest limitations

- Word-overlap similarity measures *wording*, not *meaning*. Two answers can
  mean the same thing and still score low.
- Factual scoring is keyword matching, so a sample should be checked by hand.
- Hallucination is detected by looking for "I don't know" style phrases;
  an unusual refusal wording can be miscounted.
- One setting is varied at a time, so interactions between the three settings
  are not captured.
- Only `llama3.2:3b` is tested, so the findings describe this model and should
  not be assumed to hold for other architectures or larger models.
