Reliability

updateSummary uses innerHTML on generated strings. It’s safe today, but if any user data is ever introduced, it’s an XSS risk. Build nodes instead.
Validation uses lowercased names; determinism in output uses original names. Consider normalizing names once in state or adding canonicalName to avoid mismatch.
Performance / correctness

renderEntities() currently re-renders all entities on any add/remove of properties. On large forms this will be slow and loses focus. Consider targeted DOM updates.
syncStateFromDOM() + updateStateFromInput() are both used; there’s some redundancy. Once you fully trust state, minimize DOM reads.
Testing

Add tests for migrateState() and import/export flows.
Add a lightweight DOM test to verify validation disables Generate.