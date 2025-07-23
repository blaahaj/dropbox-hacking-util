import type { SystemError } from "./systemError.js";

export const processSystemError = (systemError: SystemError) => {
  if (systemError.syscall === "getaddrinfo")
    return { tag: systemError.syscall, ...systemError } as const;

  return { tag: "other", ...systemError } as const;
};
