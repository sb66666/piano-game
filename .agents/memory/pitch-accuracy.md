---
name: Piano pitch accuracy
description: Project-specific requirement for reliable piano note detection and honest preview states.
---

Piano pitch detection must prioritize accuracy. A skipped or preview state must never be represented as a note detected from the microphone.

**Why:** the user explicitly asked that pitch accuracy be guaranteed.

**How to apply:** use the standard A4=440 Hz pitch reference, test note identification and tolerance boundaries, and keep preview feedback separate from live detection and lesson completion.
