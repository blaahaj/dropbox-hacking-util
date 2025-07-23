import type { DropboxAuth } from "dropbox";
import { readFile, rename, writeFile } from "node:fs/promises";

export interface SavedCredentials {
  access_token: string;
  app: {
    app_key: string;
    app_secret: string;
  };
  user_oauth_config:
    | undefined
    | {
        access_token: string;
        access_token_expires_at: number;
        refresh_token: string;
      };
}

export class CredentialsCache {
  private saveSeq = 0;
  constructor(private readonly credentialsPath: string) {}

  public async load(): Promise<SavedCredentials> {
    return readFile(this.credentialsPath, { encoding: "utf-8" }).then(
      (text) => JSON.parse(text) as SavedCredentials,
    );
  }

  public async save(
    credentials: Partial<SavedCredentials>,
    auth: DropboxAuth,
  ): Promise<void> {
    const newPayload = {
      ...credentials,
      user_oauth_config: {
        access_token: auth.getAccessToken(),
        access_token_expires_at: auth.getAccessTokenExpiresAt().getTime(),
        refresh_token: auth.getRefreshToken(),
      },
    };

    const tmpFile = this.credentialsPath + `.tmp.${this.saveSeq++}`;

    await writeFile(tmpFile, JSON.stringify(newPayload, null, 2) + "\n", {
      encoding: "utf-8",
      mode: 0o600,
    });

    await rename(tmpFile, this.credentialsPath);
  }
}
