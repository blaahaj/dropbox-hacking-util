import { randomUUID } from "node:crypto";

import { isErrnoException } from "@blaahaj/gotcha/OSError";
import { thenToResult } from "@blaahaj/gotcha/Result";
import { DropboxResponseError } from "dropbox";

const isErrorRetriable = (e: Error): boolean =>
  isThisErrorRetriable(e) ||
  (e.cause instanceof Error && isErrorRetriable(e.cause));

const isThisErrorRetriable = (e: Error): boolean => {
  if (e instanceof DropboxResponseError && e.status === 429) return true;

  // code=EADDRNOTAVAIL syscall=read
  // code=ECONNRESET syscall=read
  // code=ENOTFOUND syscall=getaddrinfo hostname=api.dropboxapi.com
  // code=UND_ERR_HEADERS_TIMEOUT

  if (isErrnoException(e)) {
    if (e.syscall === "getaddrinfo" && e.code === "ENOTFOUND") return true;
    if (e.syscall === "read" && e.code === "ECONNRESET") return true;
    if (e.syscall === "read" && e.code === "EADDRNOTAVAIL") return true;
    if (e.code === "UND_ERR_HEADERS_TIMEOUT") return true;
  }

  return false;
};

export const serviceFetch: typeof fetch = async (input, init?) => {
  const isRepeatable = ((): boolean => {
    if (typeof input === "string" && init && init.body) {
      const body = init.body;

      if (body === null || typeof body === "string" || body instanceof Buffer)
        return true;
    }

    return false;
  })();

  if (!isRepeatable) return fetch(input, init);

  const requestId = randomUUID().toLocaleLowerCase();
  let failures = 0;

  for (;;) {
    const r = await fetch(input, init).then(...thenToResult);

    if (r.isOK()) {
      if (failures > 0) {
        console.debug(
          `myFetch ${requestId} succeeded after ${failures} retriable failures`,
        );
      }
      return r.value;
    }

    ++failures;

    if (!isErrorRetriable(r.error)) {
      if (failures > 0) {
        console.debug(
          `myFetch ${requestId} failed (non-retriable) after ${failures} retriable failures`,
        );
      }
      throw r.error;
    }

    console.debug(
      `myFetch ${requestId} retriable failure #${failures}`,
      r.error,
    );

    await new Promise((wait) => setTimeout(wait, 30 * 1000));
  }
};
