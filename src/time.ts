/**
 * @deprecated use Temporal instead
 */
export const formatTime = (date: Date): string =>
  date.toISOString().replace(/\.\d+Z$/, "Z");

/**
 * @deprecated use Temporal instead
 */
export const parseTime = (date: string): Date => new Date(date);
