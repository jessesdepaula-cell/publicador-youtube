/**
 * Coleta refresh token de 1 canal. Uso:
 *   npx tsx scripts/collect-refresh-token.ts 1
 * Onde "1" eh o slot do canal (1, 2 ou 3).
 */
import http from "node:http";
import { URL } from "node:url";
import open from "open";
import { google } from "googleapis";
import fs from "node:fs";
import path from "node:path";

const ENV_PATH = path.resolve(process.cwd(), ".env.local");
function readEnv(): Record<string, string> {
  if (!fs.existsSync(ENV_PATH)) return {};
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}
function writeEnvKey(key: string, value: string) {
  let txt = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf8") : "";
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(txt)) txt = txt.replace(re, `${key}=${value}`);
  else txt += `\n${key}=${value}\n`;
  fs.writeFileSync(ENV_PATH, txt);
}

const slot = process.argv[2];
if (!["1", "2", "3"].includes(slot)) {
  console.error("Uso: npx tsx scripts/collect-refresh-token.ts <1|2|3>");
  process.exit(1);
}

const env = readEnv();
const CLIENT_ID = env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET;
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("GOOGLE_CLIENT_ID/SECRET faltando no .env.local");
  process.exit(1);
}

const REDIRECT = "http://localhost:53682/callback";
const oauth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT);
const authUrl = oauth.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube"],
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url!, REDIRECT);
  const code = url.searchParams.get("code");
  if (!code) { res.end("sem code"); return; }
  try {
    const { tokens } = await oauth.getToken(code);
    if (!tokens.refresh_token) {
      res.end("ERRO: sem refresh_token. Revogue acesso em myaccount.google.com/permissions e tente de novo.");
      console.error("Sem refresh_token. Vai em https://myaccount.google.com/permissions, revoga o app e tenta de novo.");
      process.exit(1);
    }
    writeEnvKey(`YT_REFRESH_TOKEN_CANAL_${slot}`, tokens.refresh_token);
    // tenta pegar o nome do canal
    try {
      oauth.setCredentials(tokens);
      const yt = google.youtube({ version: "v3", auth: oauth });
      const ch = await yt.channels.list({ part: ["snippet"], mine: true });
      const name = ch.data.items?.[0]?.snippet?.title;
      if (name) writeEnvKey(`YT_CHANNEL_${slot}_NAME`, name);
      console.log(`Canal ${slot}: ${name || "(nome nao detectado)"}`);
    } catch {}
    console.log(`Refresh token do canal ${slot} salvo em .env.local`);
    res.end("OK! Pode fechar esta aba e voltar ao terminal.");
    setTimeout(() => process.exit(0), 500);
  } catch (e: any) {
    res.end("ERRO: " + e.message); process.exit(1);
  }
});

server.listen(53682, async () => {
  console.log(`Slot ${slot} - abrindo browser...`);
  console.log(`Se nao abrir, cola no browser: ${authUrl}`);
  // ATENCAO: redirect URI desta coleta usa porta 53682. Adicione tambem no Google Cloud Console:
  // http://localhost:53682/callback
  await open(authUrl);
});
