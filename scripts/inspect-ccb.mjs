// Prints the TAG NAMES of the first group in group_profiles (no values), to confirm field names.
import { readFileSync } from "node:fs";
import { XMLParser } from "fast-xml-parser";
const env = { ...process.env };
try { for (const l of readFileSync(".env.local", "utf8").split("\n")) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); } } catch {}
const url = `https://${env.CCB_SUBDOMAIN}.ccbchurch.com/api.php?srv=group_profiles&include_participants=false`;
const auth = Buffer.from(`${env.CCB_API_USER}:${env.CCB_API_PASSWORD}`).toString("base64");
const xml = await (await fetch(url, { headers: { Authorization: `Basic ${auth}` } })).text();
const j = new XMLParser({ ignoreAttributes: false, processEntities: { enabled: true, maxEntityCount: 1e6, maxExpandedLength: 1e8 } }).parse(xml);
const g = [].concat(j.ccb_api.response.groups.group)[0];
console.log(Object.keys(g).join("\n"));
