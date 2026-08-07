from __future__ import annotations

import time
from collections import defaultdict, deque
from threading import Lock

"""Limite de tasa por objetivo (Etapa 5, seccion 31 del brief).

El limiter generico de `/api/ai-agent/vision/analyze` (`app.core.rate_limit`,
10/minuto por IP) protege el endpoint en general, pero no distingue viewport
de widget - el brief pide dos limites distintos y configurables
(`perception_max_viewport_captures_per_minute` / `_widget_`), espejo del
`PerceptionRateLimiter` del frontend (`agentPerception/cache.ts`). El
frontend ya aplica su propio limite antes de capturar, pero eso es
JavaScript en el navegador del usuario - no protege nada si alguien llama al
endpoint directo. Esta clase es la aplicacion real del lado servidor.
"""


class TargetTypeRateLimiter:
    def __init__(self) -> None:
        self._lock = Lock()
        self._hits: dict[tuple[str, str], deque[float]] = defaultdict(deque)

    def allow(self, key: str, target_type: str, limit: int, window_seconds: float = 60.0) -> bool:
        now = time.monotonic()
        cutoff = now - window_seconds
        bucket_key = (key, target_type)
        with self._lock:
            bucket = self._hits[bucket_key]
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()
            if len(bucket) >= limit:
                return False
            bucket.append(now)
            return True


perception_capture_limiter = TargetTypeRateLimiter()
