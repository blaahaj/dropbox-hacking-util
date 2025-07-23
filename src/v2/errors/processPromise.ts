import { processReason } from "./processReason.js";

export const processResolution = <V>(value: V) =>
  ({ resolved: true, value }) as const;
export const processRejection = <E = unknown>(reason: E) =>
  ({
    resolved: false,
    reason: processReason(reason),
  }) as const;
export const processPromise = [processResolution, processRejection] as const;
