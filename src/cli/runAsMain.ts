import { getDropboxClient } from "../dbx/auth/main.js";
import {
  getGlobalOptions,
  GlobalOptionsSingleton,
  writeStderr,
} from "../main/index.js";
import { Operation } from "./types.js";

export const runAsMain = (op: Operation): void => {
  const argv = process.argv.slice(2);

  const { globalOptions, remainingArgs } = getGlobalOptions(argv);
  GlobalOptionsSingleton.set(globalOptions);

  op.handler(getDropboxClient, remainingArgs, globalOptions, async () => {
    const lines = typeof op.argsHelp === "string" ? [op.argsHelp] : op.argsHelp;
    const help = [
      "Usage:\n",
      ...lines.map((line) => `  ${op.verb} ${line}\n`),
    ].join("");
    return writeStderr(help).then(() => process.exit(2));
  }).catch((err: Error) => {
    console.error({ err, stack: err.stack });
    process.exit(1);
  });
};
