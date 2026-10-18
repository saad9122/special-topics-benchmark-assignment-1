"""Scoring functions. Each one turns model text into a number."""

import json
import re
from itertools import combinations

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


# Patterns that show the model refused to answer / admitted it did not know.
# Regexes, because a refusal can be worded in many ways
# ("does not exist", "may not be a real place", "I couldn't find anything").
ABSTAIN_PATTERNS = [
    r"(do(es)?\s+not|don'?t|didn'?t|can'?t|cannot|could\s+not|couldn'?t"
    r"|unable|won'?t\s+be\s+able)[^.]{0,60}?(know|find|exist|aware"
    r"|information|verify|confirm|answer|locate|access|recall|provide)",
    r"(may|might|could|possibly)\s+not\s+(be|exist|have)",
    r"not\s+(a|an)?\s*(real|actual|genuine|well[- ]known|widely"
    r"|recognis|recogniz|established)",
    r"fiction(al|itious)?|made[- ]up|hypothetical|non-?existent",
    r"no\s+(such|record|information|data|evidence|results?|mention)",
    r"has\s+not\s+(yet\s+)?been\s+(awarded|announced|published|proven"
    r"|established|released)",
    r"knowledge\s+cut[- ]?off|training\s+data|beyond\s+my\s+knowledge",
    r"i\s+(do\s+not|don'?t)\s+have\s+(access|information|any|data)",
    r"it'?s\s+possible\s+that\s+(it|this|the\s+\w+)\s+(does\s+not"
    r"|doesn'?t|may\s+not)",
    r"(lesser[- ]known|obscure)[^.]{0,40}or[^.]{0,40}not",
]


def normalize_text(text):
    text = str(text).lower().strip()
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[^a-z0-9 ._-]", "", text)
    return text


def factual_match(response, acceptable_answers):
    """1 if any accepted answer appears in the response, else 0."""
    response_norm = normalize_text(response)

    for answer in acceptable_answers:
        answer_norm = normalize_text(answer)
        if answer_norm and answer_norm in response_norm:
            return 1
    return 0


def hallucinated(response):
    """
    For trap prompts (questions about things that do not exist).

    1 = the model invented an answer (hallucination)
    0 = the model said it did not know / that the thing does not exist
    """
    text = str(response).lower()

    for pattern in ABSTAIN_PATTERNS:
        if re.search(pattern, text):
            return 0
    return 1


def extract_json(response):
    """Find the first JSON object in the text, ignoring markdown fences."""
    text = str(response).strip()
    text = re.sub(r"^```(?:json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()

    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end < start:
        return None

    try:
        obj = json.loads(text[start:end + 1])
    except json.JSONDecodeError:
        return None

    return obj if isinstance(obj, dict) else None


def json_structure_valid(response, required_keys=None):
    """
    1 only if the response is a JSON object with exactly the requested keys.

    This is stricter than "is it parseable", which is what makes the
    effect of the sampling settings visible.
    """
    obj = extract_json(response)
    if obj is None:
        return 0

    if required_keys:
        if set(obj.keys()) != set(required_keys):
            return 0

    return 1


def json_clean_output(response):
    """1 if the raw response is pure JSON, with no surrounding chatter."""
    text = str(response).strip()
    try:
        return int(isinstance(json.loads(text), dict))
    except (TypeError, json.JSONDecodeError):
        return 0


def mean_pairwise_tfidf_similarity(texts):
    """
    How similar are repeated answers to the SAME prompt?

    1.0 = every repeat is identical (fully deterministic)
    0.0 = repeats share no wording at all
    """
    texts = [str(t).strip() for t in texts if str(t).strip()]
    if len(texts) < 2:
        return np.nan

    # If every repeat is identical, TF-IDF cannot be fitted meaningfully,
    # so handle that obvious case directly.
    if len(set(texts)) == 1:
        return 1.0

    vectorizer = TfidfVectorizer(ngram_range=(1, 2))
    matrix = vectorizer.fit_transform(texts)
    sims = cosine_similarity(matrix)

    values = [sims[i, j] for i, j in combinations(range(len(texts)), 2)]
    return float(np.mean(values))


def exact_repeat_rate(texts):
    """Share of repeats that match the most common answer word for word."""
    texts = [str(t).strip() for t in texts if str(t).strip()]
    if not texts:
        return np.nan

    counts = {}
    for t in texts:
        counts[t] = counts.get(t, 0) + 1

    return max(counts.values()) / len(texts)


def lexical_diversity(texts):
    words = []
    for text in texts:
        words.extend(re.findall(r"\b\w+\b", str(text).lower()))

    if not words:
        return np.nan

    return len(set(words)) / len(words)
