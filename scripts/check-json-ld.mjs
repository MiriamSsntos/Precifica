import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const roots = ["landing", "painel"];
const pattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

function collectHtml(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectHtml(full, out);
    } else if (extname(entry) === ".html") {
      out.push(full);
    }
  }
  return out;
}

let failures = 0;
let total = 0;

for (const root of roots) {
  for (const file of collectHtml(root)) {
    const html = readFileSync(file, "utf8");
    let match;
    let index = 0;
    while ((match = pattern.exec(html)) !== null) {
      index += 1;
      total += 1;
      try {
        JSON.parse(match[1]);
        console.log(`ok: ${file} (bloco ${index})`);
      } catch (err) {
        failures += 1;
        console.error(`ERRO: ${file} (bloco ${index}): ${err.message}`);
      }
    }
  }
}

if (failures > 0) {
  console.error(`${failures} de ${total} bloco(s) JSON-LD inválido(s).`);
  process.exit(1);
}

console.log(`JSON-LD válido em todos os arquivos (${total} bloco(s)).`);
