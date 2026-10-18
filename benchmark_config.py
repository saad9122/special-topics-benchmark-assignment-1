MODELS = [
    "llama3.2:3b",
    "qwen2.5:3b",
    "gemma3:4b",
]

TEMPERATURES = [0.2, 0.7, 1.2]
TOP_K_VALUES = [10, 40, 80]
TOP_P_VALUES = [0.7, 0.9, 1.0]

BASELINE = {
    "temperature": 0.7,
    "top_k": 40,
    "top_p": 0.9,
}

SEEDS = [1, 2, 3, 4, 5]

# Change this if you want a smaller/faster first run.
MAX_TOKENS = 512

OUTPUT_CSV = "results/raw_results.csv"
BENCHMARK_FILE = "benchmark_prompts.json"
