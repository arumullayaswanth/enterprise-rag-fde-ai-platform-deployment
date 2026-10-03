"""Amazon Bedrock text embeddings with batching and retry."""

from __future__ import annotations

import json
import os
import random
import time
from typing import Sequence

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

EMBED_MODEL_ID = os.getenv("EMBED_MODEL_ID", "amazon.titan-embed-text-v2:0")
EMBED_DIMENSION = int(os.getenv("EMBED_DIMENSION", "1024"))
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")

# Throttling controls (tunable via env, no code change needed).
# Bedrock rate-limits InvokeModel per account. More retries with longer capped
# backoff rides out ThrottlingException; a small inter-call delay keeps the
# request rate under the limit in the first place.
EMBED_MAX_RETRIES = int(os.getenv("EMBED_MAX_RETRIES", "10"))
EMBED_RETRY_BASE = float(os.getenv("EMBED_RETRY_BASE", "2.0"))
EMBED_RETRY_CAP = float(os.getenv("EMBED_RETRY_CAP", "60.0"))
# Pace between embedding calls. Default 1s keeps the rate well under a low
# default Bedrock quota so throttling is rare. Lower it if your account has a
# higher quota and you want faster ingestion.
EMBED_CALL_DELAY = float(os.getenv("EMBED_CALL_DELAY", "1.0"))

_THROTTLE_CODES = {"ThrottlingException", "TooManyRequestsException", "ServiceUnavailableException"}


def _client():
    # Adaptive mode makes botocore itself slow down and retry when Bedrock
    # throttles, with many attempts. This is the first line of defence against
    # ThrottlingException; our own loop below is the backstop.
    max_attempts = int(os.getenv("BEDROCK_MAX_ATTEMPTS", "10"))
    return boto3.client(
        "bedrock-runtime",
        region_name=AWS_REGION,
        config=Config(retries={"max_attempts": max_attempts, "mode": "adaptive"}),
    )


class Embedder:
    """Thin wrapper around a Bedrock embedding model.

    The client is created lazily so importing this module never requires
    credentials (useful in unit tests and at container build time).
    """

    def __init__(self, model_id: str = EMBED_MODEL_ID, dimension: int = EMBED_DIMENSION, client=None):
        self.model_id = model_id
        self.dimension = dimension
        self._client = client

    @property
    def client(self):
        if self._client is None:
            self._client = _client()
        return self._client

    def embed_text(self, text: str) -> list[float]:
        if not text or not text.strip():
            raise ValueError("cannot embed empty text")
        body = {"inputText": text}
        if "titan-embed-text-v2" in self.model_id:
            body["dimensions"] = self.dimension
            body["normalize"] = True

        last = EMBED_MAX_RETRIES - 1
        for attempt in range(EMBED_MAX_RETRIES):
            try:
                response = self.client.invoke_model(
                    modelId=self.model_id,
                    body=json.dumps(body),
                    accept="application/json",
                    contentType="application/json",
                )
                break
            except ClientError as exc:
                code = exc.response.get("Error", {}).get("Code", "")
                if code not in _THROTTLE_CODES or attempt == last:
                    raise
                # Capped exponential backoff with jitter, so many parallel
                # callers do not retry in lockstep and keep re-throttling.
                delay = min(EMBED_RETRY_BASE * (2**attempt), EMBED_RETRY_CAP)
                time.sleep(delay + random.uniform(0, delay * 0.25))

        payload = json.loads(response["body"].read())
        vector = payload.get("embedding") or payload.get("embeddings", [None])[0]
        if not vector:
            raise RuntimeError(f"no embedding returned by {self.model_id}")
        return [float(v) for v in vector]

    def embed_batch(self, texts: Sequence[str], batch_size: int = 16) -> list[list[float]]:
        """Embed many texts. Bedrock Titan is single-input, so this loops in slices
        to keep memory bounded and make throttling backoff predictable."""
        vectors: list[list[float]] = []
        for start in range(0, len(texts), batch_size):
            for text in texts[start : start + batch_size]:
                vectors.append(self.embed_text(text))
                # Small pace between calls keeps the request rate under the
                # account's Bedrock limit so throttling is rare, not just handled.
                if EMBED_CALL_DELAY > 0:
                    time.sleep(EMBED_CALL_DELAY)
        return vectors


_default: Embedder | None = None


def get_embedder() -> Embedder:
    global _default
    if _default is None:
        _default = Embedder()
    return _default
