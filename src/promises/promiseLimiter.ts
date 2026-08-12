import { GlobalOptionsSingleton } from "../global-options/index.js";

type Tag = string | (() => string);

type Entry<L> = {
  id: number;
  makePromise: () => Promise<L>;
  resolve: <T extends L = L>(value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
  tag: Tag;
};

export type PromiseLimiter<L> = {
  submit: <T extends L = L>(
    makePromise: () => Promise<T>,
    tag: Tag,
  ) => Promise<T>;
};

const tagToString = (tag: Tag) => (typeof tag === "string" ? tag : tag());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const makePromiseLimiter = <L = any>(
  size: number,
  name: string,
): PromiseLimiter<L> => {
  let free = size;
  const queue: Entry<L>[] = [];

  const inFlight: Record<number, Entry<L>> = {};
  const describe = () =>
    Object.values(inFlight)
      .map((e) => e.id)
      .sort()
      .join(",");

  const tryStart = () => {
    while (free > 0) {
      const entry = queue.shift();
      if (!entry) break;

      --free;
      const { id, makePromise, resolve, reject, tag } = entry;
      inFlight[id] = entry;
      if (GlobalOptionsSingleton.get()?.debugLimiter)
        console.debug(
          `${name} start job #${id}/${nextId} ${tagToString(
            tag,
          )} (in flight: ${describe()})`,
        );
      makePromise()
        .finally(() => {
          delete inFlight[id];
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

  const submit = <T extends L = L>(
    makePromise: () => Promise<T>,
    tag: Tag,
  ): Promise<T> => {
    const id = nextId++;
    if (GlobalOptionsSingleton.get()?.debugLimiter)
      console.debug(`${name} submit job #${id} ${tagToString(tag)}`);
    return new Promise((resolve, reject) => {
      queue.push({ id, makePromise, resolve, reject, tag } as Entry<T>);
      tryStart();
    });
  };

  return {
    submit,
  };
};
