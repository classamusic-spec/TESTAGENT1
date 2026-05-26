"""Walk-forward fold generation (invariant 8)."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Fold:
    """Half-open index ranges. `test` always begins where `train` ends."""

    train: tuple[int, int]
    test: tuple[int, int]


def make_walk_forward_folds(
    n_samples: int,
    train_size: int,
    test_size: int,
    step: int | None = None,
) -> list[Fold]:
    """Generate rolling walk-forward folds.

    Each fold trains on `train_size` samples and tests on the immediately
    following `test_size` samples. The window then advances by `step` (default:
    `test_size`, giving contiguous, non-overlapping test segments). Test data is
    always strictly after train data — never the same window.
    """
    if train_size < 1 or test_size < 1:
        raise ValueError("train_size and test_size must be >= 1")
    advance = test_size if step is None else step
    if advance < 1:
        raise ValueError("step must be >= 1")

    folds: list[Fold] = []
    start = 0
    while start + train_size + test_size <= n_samples:
        train_end = start + train_size
        test_end = train_end + test_size
        folds.append(Fold(train=(start, train_end), test=(train_end, test_end)))
        start += advance

    if not folds:
        raise ValueError(
            f"not enough samples ({n_samples}) for train_size={train_size} "
            f"+ test_size={test_size}"
        )
    return folds


def collect_test_indices(folds: list[Fold]) -> list[int]:
    """Sorted, de-duplicated set of test-bar indices across all folds."""
    indices: set[int] = set()
    for fold in folds:
        indices.update(range(fold.test[0], fold.test[1]))
    return sorted(indices)
