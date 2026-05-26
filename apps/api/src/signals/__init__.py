"""Signal derivation from forecasts.

Signal thresholds are strategy parameters: per invariant 6 they change through
git and human review, never at runtime based on performance. This module turns a
directional probability (the forecast's p_up) into a discrete position intent.
"""
