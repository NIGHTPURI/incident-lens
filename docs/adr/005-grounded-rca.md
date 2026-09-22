# ADR 005: Evidence before language-model inference

## Context

An LLM over raw logs can invent causes, repeat injected instructions or assert causality from correlation. A developer needs reviewable observations and reproducible comparisons, including when no paid model is configured.

## Decision

Persist a structured evidence package before analysis. Each item has stable identity, source, service, window, type, value/unit and optional trace. Rule-based RCA is the default. An optional OpenAI-compatible adapter receives only bounded evidence, requires structured JSON, validates fields and citation membership, and falls back to rules on failure. Generated reports retain uncertainty and distinguish hypotheses from measurements.

## Alternatives

Raw log prompting is easy to scaffold but hard to audit. An AI-only workflow is unavailable without credentials and nondeterministic in CI. A full causal graph/trace analyzer would improve attribution but is beyond the small reproducible scenarios. Native strict JSON schema output is stronger when supported; portable JSON mode plus local validation supports more compatible servers.

## Consequences

The application is useful offline and its citations are testable. Rules are intentionally limited and confidence is heuristic. ID validation cannot prove that text accurately interprets its cited observation; semantic hallucination remains possible. Only configured providers receive evidence outside the machine. No provider can automatically apply remediation.

## Reference

[OpenAI structured output guidance](https://developers.openai.com/api/docs/guides/structured-outputs) distinguishes JSON validity from schema adherence. This implementation validates the latter locally and rejects incomplete responses.
