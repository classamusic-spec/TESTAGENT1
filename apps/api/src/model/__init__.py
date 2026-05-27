"""In-repo trainable forecaster over engineered features + triple-barrier labels.

This is the lightweight, dependency-free model that runs anywhere (no GPU). The
full Kronos foundation model lives in apps/ml on GPU; this module gives us a
real, calibratable p_up trained on our own features/labels so the pipeline can
be validated end-to-end without the heavy model. It is a *forecasting* model
(allowed), not an RL/LLM policy deciding trades.
"""
