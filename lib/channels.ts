export type ChannelKey = "1" | "2" | "3";

export interface ChannelConfig {
  key: ChannelKey;
  name: string;
  refreshToken: string;
}

export function getChannel(key: ChannelKey): ChannelConfig {
  const refreshToken = process.env[`YT_REFRESH_TOKEN_CANAL_${key}`];
  const name = process.env[`YT_CHANNEL_${key}_NAME`] || `Canal ${key}`;
  if (!refreshToken) throw new Error(`Canal ${key} sem refresh token. Defina YT_REFRESH_TOKEN_CANAL_${key}.`);
  return { key, name, refreshToken };
}

export function listChannels(): { key: ChannelKey; name: string; configured: boolean }[] {
  return (["1", "2", "3"] as ChannelKey[]).map((key) => ({
    key,
    name: process.env[`YT_CHANNEL_${key}_NAME`] || `Canal ${key}`,
    configured: !!process.env[`YT_REFRESH_TOKEN_CANAL_${key}`],
  }));
}
