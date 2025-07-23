// Similar to a NodeJS.ErrnoException (but that's for 'path' only)
// An implementation of `SystemError`
// https://nodejs.org/api/errors.html#class-systemerror
// which doesn't actually seem to exist outside of the documentation

import os from "os";

type ErrnoNameToNumber = typeof os.constants.errno;

type Extra = Partial<{
  readonly address: string;
  readonly dest: string;
  readonly path: string;
  readonly port: number;
  readonly info: object;
}>;

export interface SystemErrorBase extends Error {
  readonly code: keyof ErrnoNameToNumber;
  readonly errno: ErrnoNameToNumber[keyof ErrnoNameToNumber];
  readonly message: string;
  readonly syscall: string;
}

export type SystemError<E extends Extra = Extra> = SystemErrorBase & E;

export const isSystemError = (error: unknown): error is SystemError =>
  error != null &&
  error instanceof Error &&
  "code" in error &&
  typeof error.code === "string" &&
  "errno" in error &&
  typeof error.errno === "number" &&
  "message" in error &&
  typeof error.message === "string" &&
  "syscall" in error &&
  typeof error.syscall === "string";
