/**
 * Precifica+ — Central de ajuda: busca + acordeão de FAQs + canais de suporte.
 */
import { useMemo, useState } from "react";
import { PageHeader } from "../components/ui/PageHeader";
import { useToast } from "../components/ui/Toast";
import styles from "./Ajuda.module.css";

interface Faq {
  q: string;
  a: string;
}

const FAQS: Faq[] = [
  {
    q: "Como a IA define o valor ideal das promoções de validade?",
    a: "A Inteligência Artificial calcula a velocidade histórica de saída do produto, o número de itens restantes no lote e os dias que faltam para expirar. Com isso, ela gera a menor taxa de desconto necessária para garantir a venda total do estoque antes do vencimento, protegendo sua margem de lucro.",
  },
  {
    q: "O Precifica+ precisa substituir meu ERP ou frente de caixa?",
    a: "Não, ele funciona de forma complementar. O software integra ao seu ecossistema via APIs ou cargas periódicas de arquivos, servindo como a camada de inteligência tática que falta nas plataformas legadas tradicionais.",
  },
  {
    q: "A IA faz alterações automáticas ou precisa de aprovação?",
    a: "Você configura o nível de autonomia que desejar. No modo piloto automático, as ações vão direto para o PDV. No modo copiloto, o painel exibe sugestões e você aprova com um toque.",
  },
  {
    q: "Como faço para adicionar mais usuários à minha conta?",
    a: "Vá em Configurações → Conta e Plano para ver o limite de usuários simultâneos do seu plano atual. Planos superiores liberam mais usuários administradores.",
  },
  {
    q: "Meus dados estão seguros e em conformidade com a LGPD?",
    a: "Sim. Todos os dados são criptografados e armazenados em conformidade com a LGPD, com controle de acesso restrito por usuário e trilha de auditoria das ações da IA.",
  },
];

export function Ajuda() {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const visible = useMemo(() => {
    const term = query.toLowerCase().trim();
    if (!term) return FAQS.map((faq, idx) => ({ ...faq, idx }));
    return FAQS.map((faq, idx) => ({ ...faq, idx })).filter(
      (faq) => faq.q.toLowerCase().includes(term) || faq.a.toLowerCase().includes(term)
    );
  }, [query]);

  return (
    <>
      <PageHeader title="Ajuda" subtitle="Central de suporte do Precifica+." />

      <div className={styles.hero}>
        <h1>Como podemos ajudar?</h1>
        <p>Busque por dúvidas, tutoriais ou fale direto com nosso suporte técnico.</p>
        <div className={styles.search}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="text"
            placeholder="Ex: como funcionam as promoções automáticas?"
            aria-label="Buscar nas perguntas frequentes"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpenIndex(null);
            }}
          />
        </div>
      </div>

      <div className={styles.supportRow}>
        <div className={`${styles.card} ${styles.supportCard}`}>
          <div className={styles.supportIcon} aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10Z"
              />
            </svg>
          </div>
          <h3>Chat ao vivo</h3>
          <p>Fale agora com nossa equipe de suporte técnico.</p>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => toast("Chat ao vivo em breve nesta versão.", "info")}
          >
            Iniciar conversa
          </button>
        </div>
        <div className={`${styles.card} ${styles.supportCard}`}>
          <div className={styles.supportIcon} aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16v16H4z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="m4 6 8 7 8-7" />
            </svg>
          </div>
          <h3>E-mail</h3>
          <p>suporte@precifica.com.br — resposta em até 24h úteis.</p>
          <a className={styles.btnSecondary} href="mailto:suporte@precifica.com.br">
            Enviar e-mail
          </a>
        </div>
        <div className={`${styles.card} ${styles.supportCard}`}>
          <div className={styles.supportIcon} aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10Z"
              />
              <circle cx="9" cy="10" r="0.8" fill="currentColor" stroke="none" />
              <circle cx="12" cy="10" r="0.8" fill="currentColor" stroke="none" />
              <circle cx="15" cy="10" r="0.8" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <h3>WhatsApp</h3>
          <p>Alertas críticos e suporte rápido pelo WhatsApp.</p>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => toast("Atendimento via WhatsApp em breve.", "info")}
          >
            Abrir WhatsApp
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <h3>Perguntas Frequentes</h3>
          <span className={styles.tag}>
            {visible.length === FAQS.length ? "Dúvidas comuns" : `${visible.length} resultado(s)`}
          </span>
        </div>
        {visible.length === 0 ? (
          <p className={styles.noResult}>
            Nenhuma resposta para “{query}”. Tente outros termos ou fale com o suporte.
          </p>
        ) : (
          <div className={styles.faqList}>
            {visible.map((faq) => (
              <div
                key={faq.idx}
                className={
                  openIndex === faq.idx ? `${styles.faqItem} ${styles.open}` : styles.faqItem
                }
              >
                <button
                  type="button"
                  className={styles.faqQuestion}
                  aria-expanded={openIndex === faq.idx}
                  onClick={() => setOpenIndex((cur) => (cur === faq.idx ? null : faq.idx))}
                >
                  {faq.q}
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                  </svg>
                </button>
                <div className={styles.faqAnswer}>
                  <p>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.resourceRow}>
        <div className={`${styles.card} ${styles.resourceCard}`}>
          <div className={styles.resourceIcon} aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15Z"
              />
            </svg>
          </div>
          <div>
            <div className={styles.rName}>Documentação</div>
            <div className={styles.rDesc}>Guias completos de uso da plataforma</div>
          </div>
        </div>
        <div className={`${styles.card} ${styles.resourceCard}`}>
          <div className={styles.resourceIcon} aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m10 8 6 4-6 4V8Z" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </div>
          <div>
            <div className={styles.rName}>Vídeos tutoriais</div>
            <div className={styles.rDesc}>Primeiros passos no Precifica+</div>
          </div>
        </div>
        <div className={`${styles.card} ${styles.resourceCard}`}>
          <div className={styles.resourceIcon} aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 3v4M15 3v4M4 11h16M6 11v9a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-9"
              />
            </svg>
          </div>
          <div>
            <div className={styles.rName}>Documentação da API</div>
            <div className={styles.rDesc}>Referência técnica para integrações</div>
          </div>
        </div>
      </div>
    </>
  );
}
