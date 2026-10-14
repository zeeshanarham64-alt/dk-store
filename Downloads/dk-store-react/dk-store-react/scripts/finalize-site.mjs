import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const url = new URL(process.env.SITE_URL || "https://dk-store-azm.vercel.app");
if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
  throw new Error("SITE_URL must be an http(s) site origin with no path, query, or fragment.");
}

async function replacePlaceholders(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await replacePlaceholders(file);
    } else if (/\.(html|xml|txt|webmanifest)$/i.test(entry.name)) {
      const content = await readFile(file, "utf8");
      const finalized = content.replaceAll("{{SITE_URL}}", url.origin);
      if (finalized !== content) await writeFile(file, finalized);
    }
  }
}

await replacePlaceholders(path.resolve("dist"));
