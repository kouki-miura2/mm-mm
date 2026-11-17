/**
 * App-wide limits and tunable values: every cap, size, duration and count the app enforces or
 * depends on, in one place. Single source of truth for the `docs/spec.md` "参照 > リミット値" table —
 * one entry per table row, referenced there as `LIMITS.<name>`. Values may change during
 * development or operation: change them here only, and update the spec table in the same change.
 *
 * Imported by both `apps/frontend` (to validate and show the limit in the UI) and `apps/backend`
 * (to enforce it in the API), so the two can never disagree.
 *
 * Conventions for each entry:
 * - Name it after what it limits, with the unit as a suffix: `...Bytes`, `...Px`, `...Days`,
 *   `...Minutes`, `...MaxLength` (characters, counted with `charLength`), a plain noun for a count.
 * - Write the value in its readable form (`300 * 1024 * 1024`, not `314572800`).
 * - JSDoc: what it limits, the unit, where it's checked (UI / API / both), and "Provisional." if
 *   the spec marks it 暫定値.
 */
export const LIMITS = {
  /** Max number of categories per user. Checked in both the UI and the API on create. */
  categoriesPerUser: 20,
  /** Max number of memos per category. Checked in both the UI and the API on create. */
  memosPerCategory: 300,
  /**
   * Characters of the memo body shown in place of an omitted keyword (counted with `charLength`).
   * Cut out in the UI. Provisional.
   */
  keywordFallbackMaxLength: 20,
  /** Min width (px) of each side of the two-column memo list. Checked in the UI. Provisional. */
  memoColumnMinWidthPx: 140,
  /** Interval (hours) between checks for a new app version while the app is open. UI only. */
  updateCheckIntervalHours: 1,
  /** Session lifetime (hours). Checked in the API on each request. */
  sessionTtlHours: 1,
  /** Months from soft delete to hard delete of categories and memos. Applied in the API. */
  deletedRetentionMonths: 1,
} as const
