---
'vite-plus-inspector': patch
---

Show config values the inspector used to drop or mangle.

- The test section shows the options set beside `test.projects`. It showed the
  projects alone.
- A list value such as `pack.format` or `test.include` shows its items instead of
  their count.
- `Infinity` and `NaN` are shown as written instead of `null`, so a
  `testTimeout: Infinity` reads as the disabled timeout it is.
