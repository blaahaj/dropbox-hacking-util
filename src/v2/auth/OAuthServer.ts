import express from "express";
import child_process from "node:child_process";
import type { DropboxAuth } from "dropbox";
import { writeStderr } from "../../logging.js";

export const port = 9988;
export const redirectUri = `http://localhost:${port}/auth`; // has to match app's config

export const runServer = async (appAuth: DropboxAuth): Promise<DropboxAuth> =>
  new Promise((resolve, reject) => {
    const app = express();
    // FIXME: can reject with EADDRINUSE (if multiple clients / threads are trying
    // to reauthenticate at the same time).
    const server = app.listen(port, "localhost", () => {
      // console.log("Listening on", server.address());
    });

    // server.on("close", () => console.debug("Server close"));
    // server.on("error", (err: Error) => console.error("Server error:", err));

    app.get("/", (_req, res) => {
      // console.debug("/");

      appAuth
        .getAuthenticationUrl(redirectUri, "myState", "code", "offline")
        .then((authUrl) => {
          // console.debug(`=> ${authUrl.toString()}`);
          res.writeHead(302, { Location: authUrl.toString() });
          res.end();
        })
        .catch((err) => console.error("getAuthenticationUrl failed:", err));
    });

    app.get("/auth", (req, res) => {
      const code = req.query.code;
      // console.debug("/auth");

      if (typeof code !== "string") {
        // console.debug("not a string");
        res.writeHead(400);
        res.end();
        return;
      }

      updateAuthFromCode(appAuth, code).then(
        () => {
          res.writeHead(200);
          res.write(
            "Dropbox authorization successful. You may close this window.",
          );
          res.end();

          server.close();
          resolve(appAuth);
        },
        (err) => {
          console.error("checkCode", err);
          res.writeHead(500);
          res.write(`${err}`);
          res.end();
          reject(new Error("OAuth2 flow failed"));
        },
      );
    });

    const startUrl = `http://localhost:${port}/`;
    void writeStderr(
      `To authorize this application to use your Dropbox, please go to the following url:\n` +
        `${startUrl}\n`,
    );

    child_process.spawn("open", [startUrl], {
      stdio: ["ignore", "ignore", "ignore"],
    });
  });

const updateAuthFromCode = async (
  auth: DropboxAuth,
  code: string,
): Promise<void> => {
  const t0 = new Date().getTime();

  const token = await auth.getAccessTokenFromCode(redirectUri, code);
  const result_2 = token.result as {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
    uid: string;
    account_id: string;
  };
  auth.setAccessToken(result_2.access_token);
  auth.setAccessTokenExpiresAt(new Date(t0 + result_2.expires_in * 1000));
  auth.setRefreshToken(result_2.refresh_token);
};
