/**
 * Precifica+ — Utilitário de Importação de Produtos via Excel / Planilhas (.xlsx, .xls, .csv).
 * Processa o arquivo no navegador (zero backend) e insere diretamente no Supabase com isolamento RLS.
 */
import * as XLSX from "xlsx";
import { createCategory } from "./categories";
import type { Category, ProductInsert } from "./supabase";
import { supabase } from "./supabase";

export interface ParsedProductRow {
  nome: string;
  sku: string | null;
  categoriaNome: string | null;
  custo: number;
  preco_venda: number;
  estoque_atual: number;
  estoque_min: number;
  validade: string | null;
}

export interface ImportResult {
  totalLidos: number;
  totalImportados: number;
  categoriasCriadas: number;
  erros: string[];
}

/** Normaliza string removendo acentos, pontuação e espaços para mapeamento resiliente de cabeçalhos */
function normalizeHeader(key: string): string {
  return String(key || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Converte diversos formatos numéricos (R$ 10,50 / 1.250,90 / 10.50 / number) em float válido */
function parseCurrencyOrNumber(val: unknown, fallback = 0): number {
  if (val === null || val === undefined || val === "") return fallback;
  if (typeof val === "number") return Number.isNaN(val) ? fallback : Math.max(0, val);

  let str = String(val).trim();
  str = str.replace(/[R$\s]/gi, "");

  // Se contém vírgula e ponto: ex 1.250,50 -> 1250.50
  if (str.includes(",") && str.includes(".")) {
    str = str.replace(/\./g, "").replace(",", ".");
  } else if (str.includes(",")) {
    // Apenas vírgula: 15,50 -> 15.50
    str = str.replace(",", ".");
  }

  const num = Number.parseFloat(str);
  return Number.isNaN(num) ? fallback : Math.max(0, num);
}

/** Converte valores para inteiros não-negativos */
function parseInteger(val: unknown, fallback = 0): number {
  const num = parseCurrencyOrNumber(val, fallback);
  return Math.max(0, Math.round(num));
}

/** Converte data do Excel (Date, serial number, string DD/MM/YYYY ou YYYY-MM-DD) para string YYYY-MM-DD */
function parseDateValue(val: unknown): string | null {
  if (!val) return null;

  // Se já for objeto Date do SheetJS
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // Se for número serial do Excel (dias desde 1899-12-30)
  if (typeof val === "number" && val > 20000 && val < 90000) {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!Number.isNaN(date.getTime())) {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, "0");
      const d = String(date.getUTCDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }

  const str = String(val).trim();
  if (!str) return null;

  // Formato DD/MM/YYYY ou DD-MM-YYYY
  const brMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (brMatch) {
    const d = brMatch[1].padStart(2, "0");
    const m = brMatch[2].padStart(2, "0");
    const y = brMatch[3];
    return `${y}-${m}-${d}`;
  }

  // Formato ISO YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, "0");
    const d = isoMatch[3].padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  return null;
}

/** Lê o arquivo Excel ou CSV e mapeia as linhas para o formato de produto */
export async function parseExcelProducts(file: File): Promise<{
  rows: ParsedProductRow[];
  erros: string[];
}> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error("O arquivo não contém nenhuma planilha legível.");
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  if (rawData.length === 0) {
    throw new Error("A planilha está vazia. Não há produtos para importar.");
  }

  const rows: ParsedProductRow[] = [];
  const erros: string[] = [];

  rawData.forEach((rawRow, index) => {
    const lineNum = index + 2; // +2 considerando cabeçalho na linha 1

    // Mapeamento dinâmico dos nomes das colunas
    const mapped: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(rawRow)) {
      const norm = normalizeHeader(key);
      if (
        norm === "nome" ||
        norm === "produto" ||
        norm === "nomedoproduto" ||
        norm === "descricao" ||
        norm === "descricaodoproduto" ||
        norm === "item" ||
        norm === "name"
      ) {
        mapped.nome = val;
      } else if (
        norm === "sku" ||
        norm === "codigo" ||
        norm === "cod" ||
        norm === "codigodebarras" ||
        norm === "codigobarras" ||
        norm === "ean" ||
        norm === "barcode"
      ) {
        mapped.sku = val;
      } else if (
        norm === "categoria" ||
        norm === "departamento" ||
        norm === "setor" ||
        norm === "grupo" ||
        norm === "cat" ||
        norm === "category"
      ) {
        mapped.categoria = val;
      } else if (
        norm === "custo" ||
        norm === "precocusto" ||
        norm === "valordecusto" ||
        norm === "valorcusto" ||
        norm === "precocompra" ||
        norm === "compra" ||
        norm === "cost"
      ) {
        mapped.custo = val;
      } else if (
        norm === "precovenda" ||
        norm === "preco" ||
        norm === "venda" ||
        norm === "valordevenda" ||
        norm === "valorvenda" ||
        norm === "valor" ||
        norm === "price"
      ) {
        mapped.preco_venda = val;
      } else if (
        norm === "estoque" ||
        norm === "estoqueatual" ||
        norm === "quantidade" ||
        norm === "qtd" ||
        norm === "saldo" ||
        norm === "stock"
      ) {
        mapped.estoque_atual = val;
      } else if (
        norm === "estoqueminimo" ||
        norm === "estoquemin" ||
        norm === "minimo" ||
        norm === "min" ||
        norm === "qtdminima" ||
        norm === "quantidademinima"
      ) {
        mapped.estoque_min = val;
      } else if (
        norm === "validade" ||
        norm === "datadevalidade" ||
        norm === "datavalidade" ||
        norm === "vencimento" ||
        norm === "datadevencimento" ||
        norm === "datavencimento" ||
        norm === "expiry" ||
        norm === "expiration"
      ) {
        mapped.validade = val;
      }
    }

    const nome = String(mapped.nome || "").trim();
    const sku = String(mapped.sku || "").trim() || null;
    const categoriaNome = String(mapped.categoria || "").trim() || null;

    // Se toda a linha for vazia, ignora sem reportar erro
    if (!nome && !sku && !mapped.preco_venda && !mapped.custo && !categoriaNome) {
      return;
    }

    if (!nome) {
      erros.push(`Linha ${lineNum}: O produto não possui nome e foi ignorado.`);
      return;
    }

    const custo = parseCurrencyOrNumber(mapped.custo, 0);
    const preco_venda = parseCurrencyOrNumber(mapped.preco_venda, 0);
    const estoque_atual = parseInteger(mapped.estoque_atual, 0);
    const estoque_min = parseInteger(mapped.estoque_min, 5);
    const validade = parseDateValue(mapped.validade);

    rows.push({
      nome,
      sku,
      categoriaNome,
      custo,
      preco_venda,
      estoque_atual,
      estoque_min,
      validade,
    });
  });

  return { rows, erros };
}

/** Importa a planilha e salva no Supabase associando ou criando categorias */
export async function importProductsToSupabase(options: {
  file: File;
  userId: string;
  existingCategories: Category[];
  onProgress?: (mensagem: string) => void;
}): Promise<ImportResult> {
  const { file, userId, existingCategories, onProgress } = options;

  onProgress?.("Lendo e interpretando arquivo Excel...");
  const { rows, erros } = await parseExcelProducts(file);

  if (rows.length === 0) {
    if (erros.length > 0) {
      throw new Error(`Nenhum produto válido encontrado. ${erros.slice(0, 3).join("; ")}`);
    }
    throw new Error("A planilha não contém produtos válidos para importação.");
  }

  onProgress?.("Verificando categorias...");

  // Mapa de categorias por nome normalizado
  const categoryMap = new Map<string, string>();
  for (const cat of existingCategories) {
    categoryMap.set(normalizeHeader(cat.nome), cat.id);
  }

  // Identifica novas categorias que precisam ser cadastradas
  const newCatNames = new Set<string>();
  for (const r of rows) {
    if (r.categoriaNome) {
      const norm = normalizeHeader(r.categoriaNome);
      if (!categoryMap.has(norm)) {
        newCatNames.add(r.categoriaNome.trim());
      }
    }
  }

  let categoriasCriadas = 0;
  if (newCatNames.size > 0) {
    onProgress?.(`Criando ${newCatNames.size} nova(s) categoria(s)...`);
    for (const name of newCatNames) {
      try {
        const created = await createCategory(userId, name);
        categoryMap.set(normalizeHeader(created.nome), created.id);
        categoriasCriadas++;
      } catch (catErr) {
        console.warn(`Não foi possível criar categoria "${name}":`, catErr);
      }
    }
  }

  onProgress?.(`Enviando ${rows.length} produtos para o catálogo...`);

  // Monta os payloads para inserção (NUNCA incluir margem_atual - coluna gerada)
  const productsToInsert: ProductInsert[] = rows.map((r) => {
    let catId: string | null = null;
    if (r.categoriaNome) {
      catId = categoryMap.get(normalizeHeader(r.categoriaNome)) || null;
    }

    return {
      user_id: userId,
      nome: r.nome,
      sku: r.sku,
      category_id: catId,
      custo: r.custo,
      preco_venda: r.preco_venda,
      estoque_atual: r.estoque_atual,
      estoque_min: r.estoque_min,
      validade: r.validade,
    };
  });

  // Insere em lotes de 50 produtos para garantir confiabilidade e rapidez
  const BATCH_SIZE = 50;
  let totalImportados = 0;

  for (let i = 0; i < productsToInsert.length; i += BATCH_SIZE) {
    const batch = productsToInsert.slice(i, i + BATCH_SIZE);
    onProgress?.(
      `Salvando produtos (${Math.min(i + batch.length, productsToInsert.length)} de ${productsToInsert.length})...`
    );

    const { error: insertErr } = await supabase.from("products").insert(batch);
    if (insertErr) {
      console.error("Erro ao inserir lote no Supabase:", insertErr);
      erros.push(
        `Erro ao salvar lote de produtos (${i + 1} a ${i + batch.length}): ${insertErr.message}`
      );
    } else {
      totalImportados += batch.length;
    }
  }

  return {
    totalLidos: rows.length,
    totalImportados,
    categoriasCriadas,
    erros,
  };
}

/** Gera e faz download de uma planilha modelo preenchida com exemplos para o usuário */
export function downloadExcelTemplate(): void {
  const dadosExemplo = [
    {
      "Nome do Produto": "Maçã Gala (kg)",
      Categoria: "Hortifruti",
      SKU: "HORT-001",
      "Preço de Custo": 4.5,
      "Preço de Venda": 8.9,
      "Estoque Atual": 85,
      "Estoque Mínimo": 20,
      "Data de Validade": "2026-10-25",
    },
    {
      "Nome do Produto": "Leite Integral 1L",
      Categoria: "Laticínios",
      SKU: "LAT-002",
      "Preço de Custo": 3.8,
      "Preço de Venda": 5.49,
      "Estoque Atual": 40,
      "Estoque Mínimo": 15,
      "Data de Validade": "2026-10-30",
    },
    {
      "Nome do Produto": "Pão Francês (kg)",
      Categoria: "Padaria",
      SKU: "PAD-003",
      "Preço de Custo": 7.2,
      "Preço de Venda": 14.9,
      "Estoque Atual": 28,
      "Estoque Mínimo": 10,
      "Data de Validade": "2026-10-18",
    },
    {
      "Nome do Produto": "Iogurte Natural 170g",
      Categoria: "Laticínios",
      SKU: "LAT-004",
      "Preço de Custo": 2.1,
      "Preço de Venda": 3.99,
      "Estoque Atual": 12,
      "Estoque Mínimo": 10,
      "Data de Validade": "2026-10-22",
    },
    {
      "Nome do Produto": "Tomate Italiano (kg)",
      Categoria: "Hortifruti",
      SKU: "HORT-005",
      "Preço de Custo": 5.0,
      "Preço de Venda": 9.9,
      "Estoque Atual": 60,
      "Estoque Mínimo": 15,
      "Data de Validade": "2026-10-20",
    },
    {
      "Nome do Produto": "Queijo Mussarela Fatiado 200g",
      Categoria: "Laticínios",
      SKU: "LAT-006",
      "Preço de Custo": 8.5,
      "Preço de Venda": 13.9,
      "Estoque Atual": 25,
      "Estoque Mínimo": 8,
      "Data de Validade": "2026-11-05",
    },
  ];

  const ws = XLSX.utils.json_to_sheet(dadosExemplo);

  // Ajusta larguras das colunas
  ws["!cols"] = [
    { wch: 32 }, // Nome do Produto
    { wch: 16 }, // Categoria
    { wch: 14 }, // SKU
    { wch: 16 }, // Preço de Custo
    { wch: 16 }, // Preço de Venda
    { wch: 16 }, // Estoque Atual
    { wch: 16 }, // Estoque Mínimo
    { wch: 18 }, // Data de Validade
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Produtos");
  XLSX.writeFile(wb, "modelo_produtos_precifica.xlsx");
}
