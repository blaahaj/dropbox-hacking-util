import type { DropboxResponseError } from "dropbox";
import type * as dbx from "dropbox";

export const isDropboxResponseError = <T>(
  candidate: unknown,
): candidate is DropboxResponseError<T> =>
  candidate instanceof Error &&
  candidate.constructor.name === "DropboxResponseError" &&
  "status" in candidate &&
  typeof candidate.status === "number" &&
  "headers" in candidate &&
  "error" in candidate;

const isRateLimit = (
  reason: DropboxResponseError<unknown>,
): reason is DropboxResponseError<dbx.Error<dbx.auth.RateLimitError>> =>
  reason.status === 429 &&
  typeof reason.error === "object" &&
  reason.error !== null &&
  "reason" in reason.error;

const isAuthError = (
  reason: DropboxResponseError<unknown>,
): reason is DropboxResponseError<unknown> & { readonly status: 401 } =>
  reason.status === 401;

export const processDropboxResponseError = <T>(
  reason: DropboxResponseError<T>,
) => {
  if (isRateLimit(reason))
    return {
      kind: "rate_limit",
      rateLimitError: reason.error.error,
      reason,
    } as const;

  if (isAuthError(reason))
    return {
      kind: "auth",
      reason,
    } as const;

  return { kind: "other", reason } as const;
};
