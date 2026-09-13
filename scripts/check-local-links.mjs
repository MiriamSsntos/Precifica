import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, extname, dirname, resolve } from "node:path";

const roots = ["landing", "painel"];
const attrPattern = /(?:href|src)=["']([^"'#]+?)["']/gi;

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

function isExternal(ref) {
  return (
    /^(https?:)?\/\//i.test(ref) ||
    /^(mailto|tel|sms|data|javascript):/i.test(ref) ||
    ref.startsWith("#") ||
    ref.startsWith("{")
  );
}

let failures = 0;
let checked = 0;

for (const root of roots) {
  for (const file of collectHtml(root)) {
    const html = readFileSync(file, "utf8");
    let match;
    const seen = new Set();
    while ((match = attrPattern.exec(html)) !== null) {
      const ref = match[1].trim();
      if (!ref || isExternal(ref) || seen.has(ref)) continue;
      seen.add(ref);
      const clean = ref.split("?")[0].split("#")[0];
      if (!clean) continue;
      checked += 1;
      const target = resolve(dirname(file), clean);
      if (!existsSync(target)) {
        failures += 1;
        console.error(`ERRO: ${file} referencia arquivo inexistente: ${ref}`);
      }
    }
  }
}

if (failures > 0) {
  console.error(`${failures} link(s) local(is) quebrado(s) em ${checked} verificado(s).`);
  process.exit(1);
}

console.log(`Todos os links locais existem (${checked} verificado(s)).`);
