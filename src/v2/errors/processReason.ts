import { isSystemError } from "./systemError.js";
import { processSystemError } from "./processSystemError.js";
import {
  isDropboxResponseError,
  processDropboxResponseError,
} from "./dropboxResponseError.js";

export const processReason = (reason: unknown) => {
  if (!(reason instanceof Error))
    return { type: "notAnError", reason } as const;

  if (isSystemError(reason))
    return {
      type: "systemError",
      systemError: processSystemError(reason),
    } as const;

  if (!isDropboxResponseError(reason))
    return { type: "unknownError", reason } as const;

  return {
    type: "dropboxResponseError",
    reason: processDropboxResponseError(reason),
  } as const;
};
