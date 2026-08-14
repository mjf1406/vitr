/** Instant entity ids are opaque strings. The generic keeps call sites readable. */
export type Id<_Table extends string = string> = string;
