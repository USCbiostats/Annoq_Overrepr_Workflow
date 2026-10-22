from typing import Callable

# Called as on_progress(done, total) after each batch of a long-running step.
ProgressCallback = Callable[[int, int], None]


def report_progress(
    on_progress: ProgressCallback | None, done: int, total: int
) -> None:
    if on_progress is not None:
        on_progress(done, total)
