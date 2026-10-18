"""All experiment settings live here. Change a value, re-run, done."""

# The single model under test: Meta Llama 3.2, 3B instruction-tuned,
# Q4_K_M quantised, run locally through Ollama.
MODELS = [
    "llama3.2:3b",
]

# The three sampling settings under test.
# The ranges are deliberately wide so the effect is visible in the results.
TEMPERATURES = [0.0, 0.3, 0.7, 1.0, 1.5]
TOP_K_VALUES = [1, 10, 40, 100]
TOP_P_VALUES = [0.3, 0.7, 0.9, 1.0]

# While one setting is varied, the other two are held at these values.
# These are the Ollama defaults for top_k / top_p, and a temperature between
# Meta's reference 0.6 and Ollama's default 0.8.
BASELINE = {
    "temperature": 0.7,
    "top_k": 40,
    "top_p": 0.9,
}

# Each condition is repeated once per seed, so we can measure determinism.
SEEDS = [1, 2, 3, 4, 5]

# Answers are short, so a small cap keeps the run fast.
MAX_TOKENS = 256

OUTPUT_CSV = "results/raw_results.csv"
BENCHMARK_FILE = "benchmark_prompts.json"
