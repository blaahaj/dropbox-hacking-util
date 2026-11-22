import { Dropbox, DropboxAuth, type DropboxOptions } from "dropbox";

import { serviceFetch } from "../errors/index.js";
import { CredentialsCache, type SavedCredentials } from "./credentialsCache.js";
import { runServer } from "./OAuthServer.js";

const envVars = {
  credentialsPath: "DROPBOX_CREDENTIALS_PATH",
  token: "DROPBOX_TOKEN",
  retryWhenOffline: "DROPBOX_RETRY_WHEN_OFFLINE",
} as const;

export type DropboxProvider = () => Promise<Dropbox>;

const checkAndRefreshAccessToken = async (auth: DropboxAuth): Promise<void> => {
  let haveWarned = false;
  for (;;) {
    try {
      await auth.checkAndRefreshAccessToken();
      break;
    } catch (error) {
      if (error instanceof Error && "code" in error) {
        if (
          error.code === "ENOTFOUND" ||
          error.code === "ECONNRESET" ||
          error.code === "ETIMEDOUT"
        ) {
          if (!haveWarned) {
            console.log(
              `checkAndRefreshAccessToken failed due to ${error.code}. Will retry every 60 seconds.`,
            );
            haveWarned = true;
          }
          await new Promise<void>((resolve) =>
            setTimeout(() => resolve(), 60000),
          );
        }
      } else {
        if (haveWarned)
          console.log(
            `checkAndRefreshAccessToken now failed with a different error, aborting`,
          );
        throw error;
      }
    }
  }

  if (haveWarned)
    console.log(`checkAndRefreshAccessToken succeeded, continuing`);
};

const checkAndRefresh = async (
  credentials: SavedCredentials,
  credentialsCache: CredentialsCache,
): Promise<DropboxAuth | undefined> => {
  if (!credentials.user_oauth_config) return undefined;

  // console.debug("Using cached auth_config");

  const auth = new DropboxAuth({
    clientId: credentials.app.app_key,
    clientSecret: credentials.app.app_secret,
  });
  const userOAuthConfig = credentials.user_oauth_config;

  auth.setAccessToken(userOAuthConfig.access_token);
  auth.setAccessTokenExpiresAt(
    new Date(userOAuthConfig.access_token_expires_at),
  );
  auth.setRefreshToken(userOAuthConfig.refresh_token);

  // console.debug("checkAndRefreshAccessToken", JSON.stringify(auth));

  return checkAndRefreshAccessToken(auth)
    .then(() => {
      // console.debug("after refresh", JSON.stringify(auth));
      void credentialsCache
        .save(credentials, auth)
        .catch((err) => console.error("saveUserCredentials failed:", err));
      return auth;
    })
    .catch((err) => {
      console.error("checkAndRefreshAccessToken failed:", err);
      return undefined;
    });
};

const reauthorize = async (
  credentials: SavedCredentials,
  credentialsCache: CredentialsCache,
): Promise<DropboxAuth> => {
  return new Promise((resolve, _reject) => {
    runServer(
      new DropboxAuth({
        clientId: credentials.app.app_key,
        clientSecret: credentials.app.app_secret,
      }),
    )
      .then((filledInAuth) => {
        void credentialsCache
          .save(credentials, filledInAuth)
          .catch((err) => console.error(`Failed to cache credentials: ${err}`));

        resolve(filledInAuth);
      })
      .catch((err) => console.error("runServer error:", err));
  });
};

export const getDropboxAuthOptions = async (): Promise<DropboxOptions> => {
  const accessToken = process.env[envVars.token];
  if (accessToken) return { accessToken };

  const cache = new CredentialsCache(
    process.env[envVars.credentialsPath] as string,
  );

  const credentials = await cache.load();

  return await checkAndRefresh(credentials, cache)
    .then((auth) => auth ?? reauthorize(credentials, cache))
    .then((auth) => ({ auth }));
};

export const getDropboxClient = async (opts?: {
  retryWhenOffline?: boolean;
}): Promise<Dropbox> =>
  getDropboxAuthOptions().then(
    (authOpts) =>
      new Dropbox({
        ...authOpts,
        fetch:
          (opts?.retryWhenOffline ?? !!process.env[envVars.retryWhenOffline])
            ? serviceFetch
            : undefined,
      }),
  );
