/**
 * Eenmalig script om een nieuw OAuth2 refresh token te genereren
 * met zowel Calendar ALS Gmail scopes.
 *
 * Start een tijdelijke mini-server op port 9876 om de callback op te vangen,
 * zodat er GEEN conflict is met Clerk / Next.js op poort 3000.
 *
 * Usage: node scripts/gen-gmail-token.mjs
 */

import { google } from "googleapis";
import { readFileSync } from "fs";
import { resolve } from "path";
import { createServer } from "http";

// Lees .env.local handmatig
const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq > 0) env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
}

const CLIENT_ID     = env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET;
const PORT          = 9876;
const REDIRECT_URI  = `http://localhost:${PORT}/callback`;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("❌ GOOGLE_CLIENT_ID en GOOGLE_CLIENT_SECRET moeten in .env.local staan");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
];

// ─── Genereer auth URL ────────────────────────────────────────────────────────
const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: SCOPES,
});

console.log("\n⚠️  BELANGRIJK: Voeg deze redirect URI toe in Google Cloud Console");
console.log(`   Credentials → OAuth 2.0 Client → Authorized redirect URIs:`);
console.log(`   ${REDIRECT_URI}\n`);
console.log("🔗 Open vervolgens deze URL in je browser:\n");
console.log(authUrl);
console.log("\n⏳ Wacht op callback...\n");

// ─── Start tijdelijke server om callback op te vangen ─────────────────────────
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === "/callback") {
    const code = url.searchParams.get("code");

    if (!code) {
      res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<h1>❌ Geen code ontvangen</h1><p>Probeer opnieuw.</p>");
      return;
    }

    try {
      const { tokens } = await oauth2Client.getToken(code);

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`
        <h1>✅ Token ontvangen!</h1>
        <p>Je kunt dit tabblad sluiten. Check de terminal voor het refresh token.</p>
      `);

      console.log("═══════════════════════════════════════════════════════════");
      console.log("✅ TOKENS ONTVANGEN!");
      console.log("═══════════════════════════════════════════════════════════");
      console.log("");
      console.log("Refresh Token:");
      console.log(tokens.refresh_token);
      console.log("");
      console.log("Scopes:", tokens.scope);
      console.log("");
      console.log("📋 Voer dit commando uit om het token in Convex op te slaan:");
      console.log(`   npx convex env set GOOGLE_REFRESH_TOKEN "${tokens.refresh_token}"`);
      console.log("");

      // Sluit de server na 1 seconde
      setTimeout(() => {
        server.close();
        process.exit(0);
      }, 1000);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<h1>❌ Fout</h1><pre>${err.message}</pre>`);
      console.error("❌ Token exchange fout:", err.message);
    }
  }
});

server.listen(PORT, () => {
  console.log(`🖥️  Callback server actief op http://localhost:${PORT}/callback`);
});
