import json
import re
from itertools import combinations

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def normalize_text(text):
    text = str(text).lower().strip()
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[^a-z0-9 ._-]", "", text)
    return text


def factual_match(response, acceptable_answers):
    """
    Simple automated factual correctness proxy.

    A response is marked correct if any acceptable answer appears
    in the normalized response. This is intentionally conservative
    and should be manually checked for final reporting.
    """
    response_norm = normalize_text(response)

    for answer in acceptable_answers:
        answer_norm = normalize_text(answer)
        if answer_norm and answer_norm in response_norm:
            return 1
    return 0


def json_structure_valid(response):
    try:
        obj = json.loads(response)
        return int(isinstance(obj, dict))
    except (TypeError, json.JSONDecodeError):
        return 0


def mean_pairwise_tfidf_similarity(texts):
    texts = [str(t).strip() for t in texts if str(t).strip()]
    if len(texts) < 2:
        return np.nan

    vectorizer = TfidfVectorizer(ngram_range=(1, 2))
    matrix = vectorizer.fit_transform(texts)
    sims = cosine_similarity(matrix)

    values = [
        sims[i, j]
        for i, j in combinations(range(len(texts)), 2)
    ]

    return float(np.mean(values))


def lexical_diversity(texts):
    words = []
    for text in texts:
        words.extend(re.findall(r"\b\w+\b", str(text).lower()))

    if not words:
        return np.nan

    return len(set(words)) / len(words)
