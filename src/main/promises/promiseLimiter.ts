import { GlobalOptionsSingleton } from "../global-options/index.js";

type Tag = string | (() => string);

type Entry = {
  id: number;
  makePromise: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason?: any) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
  tag: Tag;
};

export type PromiseLimiter = {
  submit: <T>(makePromise: () => Promise<T>, tag: Tag) => Promise<T>;
};

const tagToString = (tag: Tag) => (typeof tag === "string" ? tag : tag());

export const makePromiseLimiter = (
  size: number,
  name: string,
): PromiseLimiter => {
  let free = size;
  const queue: Entry[] = [];

  const inFlight = new Map<Entry["id"], Entry>();
  const describe = () =>
    [...inFlight.values()]
      .map((e) => e.id)
      .sort()
      .join(",");

  const tryStart = () => {
    while (free > 0) {
      const entry = queue.shift();
      if (!entry) break;

      --free;
      const { id, makePromise, resolve, reject, tag } = entry;
      inFlight.set(entry.id, entry);
      if (GlobalOptionsSingleton.get()?.debugLimiter)
        console.debug(
          `${name} start job #${id}/${nextId} ${tagToString(
            tag,
          )} (in flight: ${describe()})`,
        );
      makePromise()
        .finally(() => {
          inFlight.delete(entry.id);
          if (GlobalOptionsSingleton.get()?.debugLimiter)
            console.debug(
              `${name} end job #${id}/${nextId} ${tagToString(
                tag,
              )} (in flight: ${describe()})`,
            );
          ++free;
          tryStart();
        })
        .then(resolve, reject);
    }
  };

  let nextId = 0;

  const submit = <T>(makePromise: () => Promise<T>, tag: Tag): Promise<T> => {
    const id = nextId++;
    if (GlobalOptionsSingleton.get()?.debugLimiter)
      console.debug(`${name} submit job #${id} ${tagToString(tag)}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { promise, resolve, reject } = Promise.withResolvers<any>();

    queue.push({ id, makePromise, resolve, reject, tag });
    tryStart();
    return promise;
  };

  return {
    submit,
  };
};
