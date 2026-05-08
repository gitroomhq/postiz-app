# Analytics Normalization Foundation

This module introduces a provider-agnostic analytics normalization layer for Postiz social integrations.

## Purpose

Different social providers expose analytics with:
- inconsistent metric names
- inconsistent value formats
- differing engagement semantics

This foundation introduces a centralized normalization layer that can standardize analytics data across providers without modifying provider implementations directly.

## Current Scope

The current implementation includes:
- normalized analytics interfaces
- provider metric mappings
- analytics normalization service
- integration flow wiring

The normalized response is currently generated internally without changing existing public analytics response contracts.

## Future Opportunities

This foundation enables future analytics capabilities such as:
- unified cross-platform analytics
- engagement benchmarking
- anomaly detection
- provider-independent insights
- analytics intelligence features