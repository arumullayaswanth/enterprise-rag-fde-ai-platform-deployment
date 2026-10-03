"""Amazon Bedrock text embeddings with batching and retry."""

from __future__ import annotations

import json
import logging
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

logger = logging.getLogger(__name__)

# Throttling controls (tunable via env, no code change needed).
#
# Titan embeddings is one-input-per-call, so N chunks = N InvokeModel calls.
# New accounts have a low requests-per-minute quota, so some calls will be
# throttled. The strategy here is: short, sane backoff per call (do NOT fight
# the throttle for minutes), plus a small pace between calls. Adaptive botocore
# retries sit underneath. If a chunk still cannot embed after the retries, we
# skip it rather than aborting the whole ingest (see embed_batch).
EMBED_MAX_RETRIES = int(os.getenv("EMBED_MAX_RETRIES", "5"))
EMBED_RETRY_BASE = float(os.getenv("EMBED_RETRY_BASE", "1.0"))
EMBED_RETRY_CAP = float(os.getenv("EMBED_RETRY_CAP", "8.0"))
EMBED_CALL_DELAY = float(os.getenv("EMBED_CALL_DELAY", "0.2"))
# When true, a chunk that still throttles after all retries is skipped (its
# vector is dropped) instead of raising and failing the whole deploy.
EMBED_SKIP_ON_THROTTLE = os.getenv("EMBED_SKIP_ON_THROTTLE", "true").lower() != "false"

_THROTTLE_CODES = {"ThrottlingException", "TooManyRequestsException", "ServiceUnavailableException"}


class ThrottledOut(Exception):
    """Raised when a single text could not be embedded after all retries."""


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
                if code not in _THROTTLE_CODES:
                    raise
                if attempt == last:
                    # Out of retries on a throttle. Signal the caller so it can
                    # skip this one chunk instead of failing everything.
                    raise ThrottledOut(code) from exc
                # Short capped exponential backoff with jitter. Kept small on
                # purpose: long sleeps per chunk make a whole-corpus reindex
                # take tens of minutes and blow the step/Lambda timeout.
                delay = min(EMBED_RETRY_BASE * (2**attempt), EMBED_RETRY_CAP)
                time.sleep(delay + random.uniform(0, delay * 0.25))

        payload = json.loads(response["body"].read())
        vector = payload.get("embedding") or payload.get("embeddings", [None])[0]
        if not vector:
            raise RuntimeError(f"no embedding returned by {self.model_id}")
        return [float(v) for v in vector]

    def embed_batch(self, texts: Sequence[str], batch_size: int = 16) -> list[list[float]]:
        """Embed many texts, one call each (Titan is single-input).

        If EMBED_SKIP_ON_THROTTLE is true, a text that still throttles after all
        retries is skipped and its slot is left as None, so one unlucky chunk
        does not fail the whole ingest. Use embed_batch_indexed when you need to
        know which inputs succeeded.
        """
        results = self.embed_batch_indexed(texts, batch_size=batch_size)
        return [v for v in results if v is not None]

    def embed_batch_indexed(self, texts: Sequence[str], batch_size: int = 16) -> list[list[float] | None]:
        """Like embed_batch but returns one slot per input: the vector, or None
        if that input could not be embedded (throttled out and skipping is on)."""
        out: list[list[float] | None] = []
        skipped = 0
        for text in texts:
            try:
                out.append(self.embed_text(text))
            except ThrottledOut:
                if not EMBED_SKIP_ON_THROTTLE:
                    raise
                skipped += 1
                out.append(None)
            # Small pace between calls keeps the request rate under the
            # account's Bedrock limit so throttling is rare, not just handled.
            if EMBED_CALL_DELAY > 0:
                time.sleep(EMBED_CALL_DELAY)
        if skipped:
            logger.warning("embed_batch skipped %d of %d texts after throttling", skipped, len(texts))
        return out


_default: Embedder | None = None


def get_embedder() -> Embedder:
    global _default
    if _default is None:
        _default = Embedder()
    return _default
