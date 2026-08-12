import { GlobalOptions } from "@blaahaj/dropbox-hacking-util";
import type { DropboxProvider } from "@blaahaj/dropbox-hacking-util/v2";

export type Handler = (
  dbxp: DropboxProvider,
  argv: string[],
  globalOptions: GlobalOptions,
  usageFail: () => Promise<void>,
) => Promise<void>;

export type Operation = {
  verb: string;
  handler: Handler;
  argsHelp: string | string[];
};
