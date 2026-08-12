import { left, thenToEither } from "@blaahaj/gotcha/Either";
import { isErrnoException } from "@blaahaj/gotcha/OSError";
import { toError } from "@blaahaj/gotcha/Throw";

import {
  isAuthError,
  isDropboxResponseError,
  isRateLimit,
} from "./predicates.js";

export const dbxPromise = <T>(promise: Promise<T>) =>
  promise.then(...thenToEither).then((result) =>
    // i.e. mapLeft
    result.isRight() ? result : left(processDbxError(toError(result.left))),
  );

const processDbxError = (error: Error) => {
  if (isDropboxResponseError(error)) {
    if (isRateLimit(error)) {
      return {
        kind: "response_rate_limit_error",
        retry_after: error.error.error.retry_after,
        error,
      } as const;
    }

    if (isAuthError(error)) {
      return {
        kind: "response_auth_error",
        error,
      } as const;
    }

    return {
      kind: "response_unknown_error",
      error,
    } as const;
  }

  if (isErrnoException(error)) {
    // TODO pick out any useful errno codes
    // kind: "os_X_error"

    return {
      kind: "os_unknown_error",
      error,
    } as const;
  }

  return { kind: "unknown_error", error } as const;
};

// no auth at all: 400
// invalid access_token: response_auth_error

// x-dropbox-request-id: opaque id
// x-dropbox-response-origin: remote
// x-dropbox-request-url: /2/...

// a rejection error, JSON'd:
// {
//   "name": "DropboxResponseError",
//   "status": 429,
//   "headers": {},
//   "error": { <- RateLimitError
//     "error": {
//       "reason": { <- RateLimitReasonTooManyRequests, RateLimitReason
//         ".tag": "too_many_requests"
//       },
//       "retry_after": 5
//     },
//     "error_summary": ""
//   }
// }
