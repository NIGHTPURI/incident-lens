# ADR 005: Evidence before language-model inference

## Context

An LLM over raw logs can invent causes, repeat injected instructions or assert causality from correlation. A developer needs reviewable observations and reproducible comparisons, including when no paid model is configured.

## Decision

Persist a structured evidence package before analysis. Each item has stable identity, source, service, window, type, value/unit and optional trace. Rule-based RCA is the default. An optional OpenAI-compatible adapter receives only bounded evidence, requires structured JSON, validates fields and citation membership, and falls back to rules on failure. Generated reports retain uncertainty and distinguish hypotheses from measurements.

The response budget is enforced during receipt: a JDK `BodySubscriber` accumulates at most 65,536 bytes across chunks and cancels before accepting an over-budget batch. HTTP status and a declared oversized Content-Length can reject the body earlier. Waiting for the completed response has a 20-second deadline, with cancellation requested on timeout or interruption. Checking string length after full receipt was insufficient to bound accumulation. The input evidence retains its existing 100,000 UTF-16-code-unit limit; neither limit is a token or billing quota. See the [2026-10-02 implementation and validation record](../RCA_RESPONSE_BUDGET.md).

## Alternatives

Raw log prompting is easy to scaffold but hard to audit. An AI-only workflow is unavailable without credentials and nondeterministic in CI. A full causal graph/trace analyzer would improve attribution but is beyond the small reproducible scenarios. Native strict JSON schema output is stronger when supported; portable JSON mode plus local validation supports more compatible servers.

## Consequences

The application is useful offline and its citations are testable. Rules are intentionally limited and confidence is heuristic. ID validation cannot prove that text accurately interprets its cited observation; semantic hallucination remains possible. Only configured providers receive evidence outside the machine. No provider can automatically apply remediation.

## Reference

[OpenAI structured output guidance](https://developers.openai.com/api/docs/guides/structured-outputs) distinguishes JSON validity from schema adherence. This implementation validates the latter locally and rejects incomplete responses.
