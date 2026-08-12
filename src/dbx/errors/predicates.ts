import type * as dbx from "dropbox";
import type { DropboxResponseError } from "dropbox";

export const isDropboxResponseError = <T>(
  candidate: unknown,
): candidate is DropboxResponseError<T> =>
  candidate instanceof Error &&
  candidate.constructor.name === "DropboxResponseError" &&
  "status" in candidate &&
  typeof candidate.status === "number" &&
  "headers" in candidate &&
  "error" in candidate;

export const isRateLimit = (
  reason: DropboxResponseError<unknown>,
): reason is DropboxResponseError<dbx.Error<dbx.auth.RateLimitError>> & {
  readonly status: 429;
} => reason.status === 429;

export const isAuthError = (
  reason: DropboxResponseError<unknown>,
): reason is DropboxResponseError<dbx.Error<dbx.auth.AuthError>> & {
  readonly status: 401;
} => reason.status === 401;
