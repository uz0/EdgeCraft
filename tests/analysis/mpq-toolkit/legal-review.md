# MPQ Toolkit Licensing & Provenance Review

- Audited `src/formats/mpq` and `src/formats/compression` against StormLib (MIT) and other OSS references. No GPL or proprietary code detected.
- Confirmed original commit history (Edge Craft clean-room) and documented authorship in `CREDITS.md` revision 2025-10-26.
- Legal recommends Apache-2.0 for outbound package to maximise adoption while preserving patent grant.
- Third-party dependencies: `pako` (MIT), `lzma-native` (MIT), `seek-bzip` (MIT) — all compatible with Apache-2.0 redistribution.
- Action: include NOTICE file acknowledging StormLib specification usage.
