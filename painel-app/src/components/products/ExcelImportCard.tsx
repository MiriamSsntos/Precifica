/**
 * Precifica+ — Componente de Importação de Arquivo Excel / Planilhas de Produtos.
 * Permite arrastar ou selecionar arquivos (.xlsx, .xls, .csv), processa no navegador
 * e faz o upload automático para a tabela de produtos no Supabase com isolamento RLS.
 */
import { useRef, useState } from "react";
import { useToast } from "../../components/ui/Toast";
import type { ImportResult } from "../../lib/excelImport";
import { downloadExcelTemplate, importProductsToSupabase } from "../../lib/excelImport";
import type { Category } from "../../lib/supabase";
import styles from "./ExcelImportCard.module.css";

interface ExcelImportCardProps {
  userId: string;
  categories: Category[];
  onSuccess: () => void;
  onClose?: () => void;
}

export function ExcelImportCard({ userId, categories, onSuccess, onClose }: ExcelImportCardProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileProcess = async (file: File) => {
    // Valida tipo de arquivo
    const lowerName = file.name.toLowerCase();
    const isExcelOrCsv =
      lowerName.endsWith(".xlsx") ||
      lowerName.endsWith(".xls") ||
      lowerName.endsWith(".csv") ||
      file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.type === "application/vnd.ms-excel" ||
      file.type === "text/csv";

    if (!isExcelOrCsv) {
      toast("Por favor, selecione um arquivo válido do Excel (.xlsx, .xls) ou CSV.", "error");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setResult(null);
    setStatusMessage("Lendo arquivo...");

    try {
      const res = await importProductsToSupabase({
        file,
        userId,
        existingCategories: categories,
        onProgress: (msg) => setStatusMessage(msg),
      });

      setResult(res);

      if (res.totalImportados > 0) {
        toast(`Sucesso! ${res.totalImportados} produtos importados para o catálogo.`);
        // Atualiza a tabela de produtos no mesmo instante
        onSuccess();
      } else if (res.erros.length > 0) {
        setErrorMessage(res.erros.join("; "));
      }
    } catch (err) {
      console.error("Erro durante importação de produtos via Excel:", err);
      const msg = err instanceof Error ? err.message : "Erro desconhecido ao processar planilha.";
      setErrorMessage(msg);
      toast(msg, "error");
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isProcessing) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (isProcessing) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDownloadTemplate = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      downloadExcelTemplate();
      toast("Modelo Excel baixado com sucesso!");
    } catch (err) {
      console.error("Erro ao baixar modelo Excel:", err);
      toast("Não foi possível gerar a planilha modelo.", "error");
    }
  };

  const handleReset = () => {
    setResult(null);
    setErrorMessage(null);
    setStatusMessage("");
  };

  return (
    <div className={styles.importCard}>
      <div className={styles.cardHeader}>
        <div className={styles.titleGroup}>
          <span className={styles.excelBadge}>Excel / CSV</span>
          <h3>Importar Catálogo de Produtos</h3>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.btnDownloadTemplate}
            onClick={handleDownloadTemplate}
            title="Baixar planilha modelo com colunas preenchidas"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Baixar Modelo (.xlsx)
          </button>
          {onClose && (
            <button
              type="button"
              className={styles.btnCloseCard}
              onClick={onClose}
              title="Fechar importador"
              aria-label="Fechar importador"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Input de arquivo invisível ativado pelo clique no dropzone */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className={styles.fileInputHidden}
        onChange={handleInputChange}
        disabled={isProcessing}
      />

      {isProcessing ? (
        <div className={styles.progressState}>
          <div className={styles.spinner} />
          <div className={styles.progressMessage}>{statusMessage || "Processando planilha..."}</div>
          <div className={styles.progressDetail}>
            Inserindo produtos diretamente no banco de dados Supabase...
          </div>
        </div>
      ) : result ? (
        <div className={styles.successBanner}>
          <div className={styles.successIcon}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className={styles.successContent}>
            <div className={styles.successTitle}>
              {result.totalImportados} produto(s) importado(s) com sucesso!
            </div>
            <div className={styles.successSubtitle}>
              {result.categoriasCriadas > 0
                ? `${result.categoriasCriadas} nova(s) categoria(s) criada(s) automaticamente. `
                : ""}
              Todos os itens já estão cadastrados e visíveis na listagem abaixo.
            </div>

            {result.erros.length > 0 && (
              <ul className={styles.errorList}>
                {result.erros.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            )}

            <div className={styles.successActions}>
              <button
                type="button"
                className={styles.btnNewImport}
                onClick={() => {
                  handleReset();
                  fileInputRef.current?.click();
                }}
              >
                Importar outro arquivo
              </button>
              {onClose && (
                <button type="button" className={styles.btnDownloadTemplate} onClick={onClose}>
                  Concluir
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            className={`${styles.dropzone} ${isDragOver ? styles.dragOver : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Anexar arquivo Excel ou CSV para importação automática"
          >
            <div className={styles.iconCircle}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="12" y2="12" />
                <line x1="15" y1="15" x2="12" y2="12" />
              </svg>
            </div>
            <div className={styles.dropzonePrompt}>
              <span>Clique para selecionar</span> ou arraste a planilha aqui
            </div>
            <div className={styles.dropzoneHint}>
              Suporta planilhas <strong>.xlsx</strong>, <strong>.xls</strong> ou{" "}
              <strong>.csv</strong>. Ao anexar, os produtos serão processados e salvos no banco de
              dados automaticamente.
            </div>
          </button>

          {errorMessage && (
            <div className={styles.errorBanner}>
              <div className={styles.errorIcon}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div className={styles.errorContent}>
                <div className={styles.errorTitle}>Não foi possível importar a planilha</div>
                <div className={styles.errorText}>{errorMessage}</div>
              </div>
            </div>
          )}

          <div className={styles.columnGuide}>
            <span>Colunas reconhecidas automaticamente:</span>
            <div className={styles.columnPills}>
              <span className={`${styles.pill} ${styles.pillReq}`}>Nome *</span>
              <span className={styles.pill}>Categoria</span>
              <span className={styles.pill}>SKU / Código</span>
              <span className={styles.pill}>Custo</span>
              <span className={styles.pill}>Preço Venda</span>
              <span className={styles.pill}>Estoque</span>
              <span className={styles.pill}>Estoque Mínimo</span>
              <span className={styles.pill}>Validade</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
