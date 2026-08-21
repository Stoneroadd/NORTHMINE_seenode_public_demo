# Operational Data Quality Contract

Canonical states:

- `FRESH`: within source/site freshness SLA and complete enough for its declared use.
- `STALE`: last valid value exists but exceeds SLA; include last-success/as-of time.
- `INCOMPLETE`: required fields/intervals are missing.
- `CONFLICTING`: authoritative inputs disagree or exclusive intervals overlap.
- `UNAVAILABLE`: no safe value exists.

Quality is evaluated per field/evidence and summarized conservatively for a snapshot. **Unknown must not become Normal.** Stale data may support historical context but cannot create a new “live normal” conclusion. Events remain open or enter data-uncertain handling; they do not normalize from silence. Graph edges affected by missing evidence are stale/incomplete, not removed as if disproven.

Recommendations are suppressed or explicitly downgraded when required inputs are stale/incomplete/conflicting. AI must cite the quality limitation and cannot fill gaps. Reports preserve the quality at generation plus evidence timestamps. Replay preserves historical quality and later corrections.

UI shows quality when decision-relevant: `Operational data delayed`, last synchronization and safe capabilities. Data-system failures use distinct semantics from mine operational events.
