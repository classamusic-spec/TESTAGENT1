"""Market-data ingestion.

The single most important rule here is invariant 1: only closed candles ever
leave this module. Look-ahead bias from including the in-progress candle is the
most common bug in trading systems, so closing is enforced and tested.
"""
