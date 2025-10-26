# Trigger System Data Requirements

Derived from `src/triggers` schemas and gameplay design notes (2025-10-24):

- Dynamic text + localised strings (UTF-8) with rich formatting (bold, colour, icon inline).
- Countdown / progress bars (supports fractional seconds, color thresholds).
- Choice dialogs (2–4 options) with keyboard/controller focus metadata.
- Objective tracker feed with priority, expiry, and trigger-supplied icon.
- Floating event overlays (world-anchored) referencing scene entity IDs.
- Audio caption hooks (speaker ID, subtitle text, optional portrait).
- Trigger-authored layout schema to be converted into Babylon GUI control tree.
