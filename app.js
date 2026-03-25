// ============================================
// SISTEMA DE TEMA (Claro/Escuro)
// ============================================

const themeToggle = document.getElementById("themeToggle");
const themeToggleText = themeToggle?.querySelector(".theme-toggle__text");
const html = document.documentElement;

const getPreferredTheme = () => {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
};

// Carregar tema salvo ou usar preferência do navegador/sistema
const loadTheme = () => {
  const theme = getPreferredTheme();
  html.setAttribute("data-theme", theme);
  updateThemeText(theme);
};

// Se o usuário não escolheu manualmente (sem theme salvo), acompanhar tema do sistema
const watchSystemTheme = () => {
  const mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  if (!mq) return;

  const onChange = () => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light" || savedTheme === "dark") return;
    const theme = mq.matches ? "dark" : "light";
    html.setAttribute("data-theme", theme);
    updateThemeText(theme);
  };

  // Suporte moderno + fallback
  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", onChange);
  } else if (typeof mq.addListener === "function") {
    mq.addListener(onChange);
  }
};

// Atualizar texto do botão
const updateThemeText = (theme) => {
  if (themeToggleText) {
    themeToggleText.textContent = theme === "light" ? "Tema Claro" : "Tema Escuro";
  }
};

// Alternar tema
const toggleTheme = () => {
  const currentTheme = html.getAttribute("data-theme") || getPreferredTheme();
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  
  html.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
  updateThemeText(newTheme);
};

// Event listener para o botão de tema
if (themeToggle) {
  themeToggle.addEventListener("click", toggleTheme);
}

// Carregar tema ao iniciar
loadTheme();
watchSystemTheme();

// ============================================
// UTIL: COPIAR PARA A ÁREA DE TRANSFERÊNCIA (mobile-safe)
// ============================================
const copyTextToClipboard = async (text) => {
  if (text == null) return false;
  const str = String(text);

  try {
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function" &&
      (typeof window === "undefined" || window.isSecureContext !== false)
    ) {
      await navigator.clipboard.writeText(str);
      return true;
    }
  } catch (e) {
    // fallback abaixo
  }

  try {
    const ta = document.createElement("textarea");
    ta.value = str;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    ta.style.left = "-9999px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    // iOS Safari
    try {
      ta.setSelectionRange(0, ta.value.length);
    } catch (e) {
      // noop
    }
    const ok = document.execCommand && document.execCommand("copy");
    document.body.removeChild(ta);
    return !!ok;
  } catch (e) {
    return false;
  }
};

// ============================================
// SISTEMA DE SIDEBAR (Menu Lateral)
// ============================================

const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const currentToolNameEl = document.getElementById("currentToolName");
const currentToolIconEl = document.getElementById("currentToolIcon");
const isMobileLayout = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(max-width: 768px)").matches;

const TOOL_UI = Object.freeze({
  sql: { label: "Formatador de SQL", icon: "⚡" },
  xml: { label: "Formatador de XML", icon: "📄" },
  json: { label: "Formatador de JSON", icon: "🔷" },
  password: { label: "Gerador de Senhas", icon: "🔒" },
  fake: { label: "Dados Fake", icon: "👤" },
  qrcode: { label: "QR Code", icon: "📱" },
  uuid: { label: "Gerador de UUID", icon: "🔑" },
});

const updateToolContext = (tabKey) => {
  const meta = TOOL_UI[tabKey] || { label: "Ferramenta", icon: "🧰" };
  if (currentToolNameEl) currentToolNameEl.textContent = meta.label;
  if (currentToolIconEl) currentToolIconEl.textContent = meta.icon;

  // Título da página (melhora orientação e histórico do navegador)
  try {
    document.title = `${meta.label} | DEV TOOLS`;
  } catch (e) {
    // noop
  }
};

const scrollActiveTabIntoView = () => {
  const active = document.querySelector('.sidebar__tab[aria-selected="true"]');
  if (!active) return;
  // Evita scroll desnecessário se já estiver visível
  try {
    active.scrollIntoView({ block: "nearest" });
  } catch (e) {
    // noop
  }
};

const closeSidebar = () => {
  sidebar.setAttribute("data-open", "false");
  sidebarToggle.setAttribute("aria-expanded", "false");
  sidebarOverlay.setAttribute("data-active", "false");
  document.body.style.overflow = "";
};

// Controlar abertura/fechamento do sidebar no mobile
const toggleSidebar = () => {
  // Em desktop o sidebar é fixo; evitar estados estranhos (overflow travado etc.)
  if (!isMobileLayout()) return;

  const isOpen = sidebar.getAttribute("data-open") === "true";
  sidebar.setAttribute("data-open", !isOpen);
  sidebarToggle.setAttribute("aria-expanded", !isOpen);
  sidebarOverlay.setAttribute("data-active", !isOpen);

  if (!isOpen) {
    // Ao abrir, garantir que a opção ativa esteja visível no drawer
    window.setTimeout(scrollActiveTabIntoView, 0);
  }
  
  // Prevenir scroll do body quando menu está aberto
  if (!isOpen) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "";
  }
};

// Fechar sidebar ao clicar no overlay
sidebarOverlay.addEventListener("click", () => {
  if (sidebar.getAttribute("data-open") === "true") {
    toggleSidebar();
  }
});

// Controlar botão hambúrguer
sidebarToggle.addEventListener("click", toggleSidebar);

// Fechar sidebar ao clicar em uma aba no mobile
const closeSidebarOnMobile = () => {
  if (!isMobileLayout()) return;
  if (sidebar.getAttribute("data-open") !== "true") return;
  closeSidebar();
};

// Fechar sidebar ao redimensionar para desktop
const handleResize = () => {
  if (!isMobileLayout()) {
    sidebar.setAttribute("data-open", "true");
    sidebarToggle.setAttribute("aria-expanded", "false");
    sidebarOverlay.setAttribute("data-active", "false");
    document.body.style.overflow = "";
  } else {
    // Se redimensionar para mobile, fechar sidebar se estiver aberto
    if (sidebar.getAttribute("data-open") === "true") {
      closeSidebar();
    }
  }
};

window.addEventListener("resize", handleResize);

// Inicializar estado do sidebar baseado no tamanho da tela
if (!isMobileLayout()) {
  sidebar.setAttribute("data-open", "true");
  sidebarToggle.setAttribute("aria-expanded", "false");
} else {
  sidebar.setAttribute("data-open", "false");
  sidebarToggle.setAttribute("aria-expanded", "false");
}

// Fechar sidebar (mobile) ao navegar via hash/back-forward
window.addEventListener("hashchange", () => {
  closeSidebarOnMobile();
});

// ============================================
// SISTEMA DE ABAS
// ============================================

const tabs = document.querySelectorAll(".tab, .sidebar__tab");
const tabContents = document.querySelectorAll(".tab-content");

// A11Y: roving tabindex + teclado em tabs
const tabButtons = Array.from(tabs).filter((t) => t && t.getAttribute("role") === "tab");

const setRovingTabIndex = (activeTabKey) => {
  tabButtons.forEach((btn) => {
    const isActive = btn.dataset.tab === activeTabKey;
    btn.tabIndex = isActive ? 0 : -1;
  });
};

// Inicializar tabindex baseado no aria-selected atual
const initiallySelectedTab =
  tabButtons.find((b) => b.getAttribute("aria-selected") === "true") || tabButtons[0];
if (initiallySelectedTab) setRovingTabIndex(initiallySelectedTab.dataset.tab);

tabButtons.forEach((btn) => {
  btn.addEventListener("keydown", (e) => {
    const key = e.key;
    const idx = tabButtons.indexOf(btn);
    if (idx < 0) return;

    const focusAt = (nextIdx) => {
      const el = tabButtons[nextIdx];
      if (el) el.focus();
    };

    if (key === "ArrowDown" || key === "ArrowRight") {
      e.preventDefault();
      focusAt((idx + 1) % tabButtons.length);
      return;
    }
    if (key === "ArrowUp" || key === "ArrowLeft") {
      e.preventDefault();
      focusAt((idx - 1 + tabButtons.length) % tabButtons.length);
      return;
    }
    if (key === "Home") {
      e.preventDefault();
      focusAt(0);
      return;
    }
    if (key === "End") {
      e.preventDefault();
      focusAt(tabButtons.length - 1);
      return;
    }
    if (key === "Enter" || key === " ") {
      e.preventDefault();
      btn.click();
    }
  });
});

const switchTab = (targetTab) => {
  tabs.forEach((tab) => {
    const isSelected = tab.dataset.tab === targetTab;
    tab.setAttribute("aria-selected", isSelected);
  });

  tabContents.forEach((content) => {
    const isActive = content.id === `${targetTab}-content`;
    content.setAttribute("data-active", isActive);
    content.hidden = !isActive;
  });

  setRovingTabIndex(targetTab);
  updateToolContext(targetTab);

  // Salvar aba ativa no localStorage
  localStorage.setItem("activeTab", targetTab);
  
  // Atualizar URL com âncora amigável para SEO
  const anchorMap = {
    sql: 'formatador-sql',
    xml: 'formatador-xml',
    json: 'formatador-json',
    password: 'gerador-senhas',
    fake: 'dados-fake-brasil',
    qrcode: 'gerador-qrcode',
    uuid: 'gerador-uuid'
  };
  
  const anchor = anchorMap[targetTab] || targetTab;
  if (history.pushState) {
    history.pushState(null, null, `#${anchor}`);
  } else {
    window.location.hash = anchor;
  }
};

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    switchTab(tab.dataset.tab);
    closeSidebarOnMobile(); // Fechar sidebar no mobile após selecionar uma aba
  });
});

// Mapear âncoras amigáveis para tabs
const anchorToTabMap = {
  'formatador-sql': 'sql',
  'formatador-xml': 'xml',
  'formatador-json': 'json',
  'gerador-senhas': 'password',
  'dados-fake-brasil': 'fake',
  'gerador-qrcode': 'qrcode',
  'gerador-uuid': 'uuid'
};

// Restaurar aba ativa ao carregar (prioridade: URL hash > localStorage > padrão SQL)
const getInitialTab = () => {
  // Verificar se há âncora na URL
  if (window.location.hash) {
    const anchor = window.location.hash.substring(1); // Remove o #
    const tab = anchorToTabMap[anchor];
    if (tab) {
      return tab;
    }
  }
  
  // Verificar localStorage
  const savedTab = localStorage.getItem("activeTab");
  if (savedTab) {
    return savedTab;
  }
  
  // Padrão: SQL
  return "sql";
};

const initialTab = getInitialTab();
switchTab(initialTab);
scrollActiveTabIntoView();

// Nota: toolsCount foi removido do HTML; manter sem atualizar contador.

// ============================================
// SISTEMA DE TOAST
// ============================================

const toastContainer = document.getElementById("toastContainer");

const showToast = (message, type = "info") => {
  if (!toastContainer) return;

  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;

  const icons = {
    success: "✓",
    error: "✕",
    info: "ℹ",
  };

  const iconEl = document.createElement("span");
  iconEl.className = "toast__icon";
  iconEl.textContent = icons[type] || icons.info;

  const msgEl = document.createElement("span");
  msgEl.className = "toast__message";
  msgEl.textContent = String(message ?? "");

  toast.appendChild(iconEl);
  toast.appendChild(msgEl);
  toastContainer.appendChild(toast);

  window.setTimeout(() => toast.remove(), 3000);
};

// ============================================
// CONTADORES DE LINHAS E CARACTERES
// ============================================

const updateStats = (inputEl, statsEl) => {
  const text = inputEl.value;
  const lines = text.split("\n").length;
  const chars = text.length;
  statsEl.textContent = `${lines} linhas • ${chars} caracteres`;
};

const setupStats = (inputId, statsId) => {
  const input = document.getElementById(inputId);
  const stats = document.getElementById(statsId);
  if (!input || !stats) return;

  input.addEventListener("input", () => updateStats(input, stats));
  updateStats(input, stats);
};

// Configurar contadores para todos os campos
setupStats("sqlInput", "sqlInputStats");
setupStats("sqlOutput", "sqlOutputStats");
setupStats("xmlInput", "xmlInputStats");
setupStats("xmlOutput", "xmlOutputStats");
setupStats("jsonInput", "jsonInputStats");
setupStats("jsonOutput", "jsonOutputStats");

// ============================================
// FORMATADOR SQL (Mantido da versão anterior)
// ============================================

const sqlInputEl = document.getElementById("sqlInput");
const sqlOutputEl = document.getElementById("sqlOutput");
const sqlCopyBtn = document.getElementById("sqlCopyBtn");
const sqlResetBtn = document.getElementById("sqlResetBtn");
const formatStyleEl = document.getElementById("formatStyle");
const caseStyleEl = document.getElementById("caseStyle");

const normalizeDelphiBreaks = (text) =>
  text
    .replace(/#13#10|#10#13/gi, "\n")
    .replace(/#13|#10/gi, "\n");

const stripBackslashes = (text) => text.replace(/\\/g, "");

const collapseWhitespace = (text) =>
  text
    .replace(/\s+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

const removeOuterQuotes = (chunk) => {
  if (chunk.length < 2) return chunk;
  const first = chunk.at(0);
  const last = chunk.at(-1);
  if ((first === "'" && last === "'") || (first === '"' && last === '"')) {
    const body = chunk.slice(1, -1);
    const unescaped = first === "'" ? body.replace(/''/g, "'") : body.replace(/""/g, '"');
    return unescaped;
  }
  return chunk;
};

const CONNECTOR_ONLY_PATTERN = /^(?:\+|&|\.\.)+$/;

const stripDanglingQuotes = (chunk) => {
  if (!chunk) return chunk;
  const first = chunk.at(0);
  const last = chunk.at(-1);
  const isQuoteChar = (char) => char === "'" || char === '"';
  if (isQuoteChar(first) && !isQuoteChar(last)) {
    return chunk.slice(1);
  }
  if (!isQuoteChar(first) && isQuoteChar(last)) {
    return chunk.slice(0, -1);
  }
  return chunk;
};

const splitFragments = (text) =>
  text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^(\+|&|\.\.)\s*/, "").replace(/\s*(\+|&|\.\.)$/, ""))
    .map((line) => line.replace(/\s*\/\/.*$/, ""))
    .map(removeOuterQuotes)
    .map(stripDanglingQuotes)
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      const compact = line.replace(/\s+/g, "");
      return !CONNECTOR_ONLY_PATTERN.test(compact);
    });

const hasCodeArtifacts = (text) => /(\+|&|\.\.)|#13|#10|\\/.test(text);

const cleanSql = (raw) => {
  if (!raw.trim()) return "";
  const normalized = stripBackslashes(normalizeDelphiBreaks(raw)).trim();
  const unwrapped = removeOuterQuotes(normalized);
  if (!hasCodeArtifacts(raw)) {
    return collapseWhitespace(unwrapped);
  }
  const fragments = splitFragments(unwrapped);
  if (fragments.length === 0) {
    return collapseWhitespace(unwrapped);
  }
  return collapseWhitespace(fragments.join(" "));
};

const FORMAT_OPTIONS = Object.freeze({
  readable: {
    linesBetweenQueries: 1,
    keywordCase: "upper",
    expressionWidth: 110,
    denseOperators: false,
    indentWidth: 2,
    logicalOperatorNewline: "before",
  },
  compact: {
    linesBetweenQueries: 1,
    keywordCase: "upper",
    expressionWidth: 200,
    denseOperators: true,
    indentWidth: 2,
    logicalOperatorNewline: "after",
  },
  minimal: null,
});

const DIALECT_PRIORITY = Object.freeze([
  "sql",
  "postgresql",
  "mysql",
  "mariadb",
  "sqlite",
  "sqlserver",
  "plsql",
  "db2",
  "bigquery",
  "snowflake",
  "hive",
  "spark",
  "trino",
  "n1ql",
  "redshift",
]);

const inferDialect = (sql) => {
  // Firebird / Interbase hints
  if (/\bRDB\$\w+/i.test(sql) || /\bFIRST\s+\d+/i.test(sql) || /\bSKIP\s+\d+/i.test(sql)) {
    return "sql"; // usar SQL genérico como fallback mais seguro
  }
  if (/\bTOP\s+\d+/i.test(sql) || /\bNVARCHAR\b/i.test(sql) || /\[\w+\]/.test(sql) || /@@\w+/i.test(sql)) {
    return "sqlserver";
  }
  if (/::\w+/.test(sql) || /\bILIKE\b/i.test(sql) || /\bSTRING_AGG\b/i.test(sql)) {
    return "postgresql";
  }
  if (/`[^`]+`/.test(sql) || /\bAUTO_INCREMENT\b/i.test(sql)) {
    return "mysql";
  }
  if (/\bCONNECT BY\b/i.test(sql) || /\bNVL\(/i.test(sql) || /\bROWNUM\b/i.test(sql)) {
    return "plsql";
  }
  if (/\bSTRUCT</i.test(sql) || /\bUNNEST\(/i.test(sql)) {
    return "bigquery";
  }
  if (/\bQUALIFY\b/i.test(sql)) {
    return "snowflake";
  }
  return null;
};

const buildDialectOrder = (sql) => {
  const hinted = inferDialect(sql) || "sql";
  const ordered = [hinted, ...DIALECT_PRIORITY];
  return Array.from(new Set(ordered));
};

// Formatação simples como último recurso quando a lib não suporta o dialeto (ex.: Firebird)
const basicSqlFormatter = (sql) => {
  if (!sql) return sql;
  const breakers = [
    "SELECT",
    "FROM",
    "WHERE",
    "GROUP BY",
    "ORDER BY",
    "HAVING",
    "JOIN",
    "LEFT JOIN",
    "RIGHT JOIN",
    "INNER JOIN",
    "OUTER JOIN",
    "CROSS JOIN",
    "UNION",
    "UNION ALL",
    "EXCEPT",
    "INTERSECT",
    "VALUES",
    "WHEN",
    "THEN",
    "ELSE",
    "END",
    "WITH",
  ];
  const pattern = new RegExp(`\\b(${breakers.join("|")})\\b`, "gi");
  const withBreaks = sql.replace(pattern, "\n$1");
  return withBreaks
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
};

const formatSqlWithDialects = (sql, preset) => {
  const { format } = window.sqlFormatter ?? {};
  if (!format) return basicSqlFormatter(sql);

  const baseOptions = { ...preset };
  const dialectsToTry = buildDialectOrder(sql);
  let lastError;

  for (const language of dialectsToTry) {
    try {
      return format(sql, { ...baseOptions, language });
    } catch (err) {
      lastError = err;
    }
  }

  // Fallback simples para dialetos não suportados
  return basicSqlFormatter(sql);
};

const compressEmptyLines = (text) =>
  text
    .replace(/\r\n/g, "\n")
    .replace(/\n(?:\s*\n)+/g, "\n");

const COMPACT_BREAKERS = [
  "SELECT",
  "FROM",
  "WHERE",
  "GROUP",
  "ORDER",
  "HAVING",
  "WHEN",
  "THEN",
  "ELSE",
  "END",
  "JOIN",
  "LEFT",
  "RIGHT",
  "INNER",
  "OUTER",
  "UNION",
  "CASE",
  "WITH",
];

const isCompactBreakLine = (line) => {
  const upper = line.toUpperCase();
  return COMPACT_BREAKERS.some((kw) => upper === kw || upper.startsWith(`${kw} `));
};

const compactify = (text) => {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return "";
  const merged = lines.reduce((acc, line) => {
    if (isCompactBreakLine(line) || line === ")") {
      acc.push(line);
      return acc;
    }
    if (acc.length === 0) {
      acc.push(line);
      return acc;
    }
    acc[acc.length - 1] = `${acc[acc.length - 1]} ${line}`;
    return acc;
  }, []);
  return merged.join("\n");
};

const applyCaseTransform = (text, mode) => {
  if (!text) return text;
  switch (mode) {
    case "upper":
      return text.toUpperCase();
    case "lower":
      return text.toLowerCase();
    default:
      return text;
  }
};

const processSql = () => {
  const raw = sqlInputEl.value;
  if (!raw.trim()) {
    sqlOutputEl.value = "";
    sqlOutputEl.classList.remove("text-input--error");
    return;
  }
  const cleaned = cleanSql(raw);
  let formatted = cleaned;
  if (cleaned) {
    const preset = FORMAT_OPTIONS[formatStyleEl.value];
    if (preset) {
      try {
        formatted = formatSqlWithDialects(cleaned, preset);
      } catch (e) {
        console.error("Erro ao formatar SQL:", e);
        sqlOutputEl.classList.add("text-input--error");
        showToast("Erro ao formatar SQL. Verifique a sintaxe.", "error");
        return;
      }
    }
    if (preset) {
      formatted = compressEmptyLines(formatted);
    }
    if (formatStyleEl.value === "compact") {
      formatted = compactify(formatted);
    }
  }
  sqlOutputEl.value = applyCaseTransform(formatted, caseStyleEl.value);
  sqlOutputEl.classList.remove("text-input--error");
  updateStats(sqlOutputEl, document.getElementById("sqlOutputStats"));
  saveToHistory("sql", raw, sqlOutputEl.value, { formatStyle: formatStyleEl.value, caseStyle: caseStyleEl.value });
};

let sqlDebounceId;
const scheduleSqlProcess = () => {
  window.clearTimeout(sqlDebounceId);
  sqlDebounceId = window.setTimeout(processSql, 200);
};

sqlInputEl.addEventListener("input", scheduleSqlProcess);
formatStyleEl.addEventListener("change", processSql);
caseStyleEl.addEventListener("change", processSql);

sqlCopyBtn.addEventListener("click", async () => {
  if (!sqlOutputEl.value.trim()) {
    showToast("Nada para copiar", "info");
    return;
  }
  try {
    const ok = await copyTextToClipboard(sqlOutputEl.value);
    if (!ok) throw new Error("Clipboard not available");
    showToast("SQL copiado com sucesso!", "success");
  } catch (e) {
    console.error("Não foi possível copiar:", e);
    showToast("Erro ao copiar", "error");
  }
});

sqlResetBtn.addEventListener("click", () => {
  sqlInputEl.value = "";
  sqlOutputEl.value = "";
  formatStyleEl.value = "readable";
  caseStyleEl.value = "normal";
  sqlOutputEl.classList.remove("text-input--error");
  updateStats(sqlInputEl, document.getElementById("sqlInputStats"));
  updateStats(sqlOutputEl, document.getElementById("sqlOutputStats"));
  sqlInputEl.focus();
  processSql();
});

const sqlFavoriteBtn = document.getElementById("sqlFavoriteBtn");
if (sqlFavoriteBtn) {
  sqlFavoriteBtn.addEventListener("click", () => {
    if (!sqlOutputEl.value.trim()) {
      showToast("Formate um SQL primeiro", "info");
      return;
    }
    if (typeof window.openFavoriteFromCurrent === "function") {
      window.openFavoriteFromCurrent("sql", sqlInputEl.value, sqlOutputEl.value, { formatStyle: formatStyleEl.value, caseStyle: caseStyleEl.value });
    }
  });
}

// ============================================
// FORMATADOR XML
// ============================================

const xmlInputEl = document.getElementById("xmlInput");
const xmlOutputEl = document.getElementById("xmlOutput");
const xmlCopyBtn = document.getElementById("xmlCopyBtn");
const xmlResetBtn = document.getElementById("xmlResetBtn");
const xmlIndentEl = document.getElementById("xmlIndent");

// Função para traduzir mensagens de erro do XML
const translateXMLError = (errorMsg) => {
  if (!errorMsg) return "XML inválido. Verifique a sintaxe.";
  
  // Traduzir mensagens comuns do DOMParser
  const translations = {
    "Comment must not contain '--'": "Comentário não pode conter '--' (hífen duplo)",
    "Unexpected end tag": "Tag de fechamento inesperada",
    "Unclosed tag": "Tag não fechada",
    "Unexpected token": "Token inesperado",
    "Invalid character": "Caractere inválido",
    "Missing end tag": "Tag de fechamento ausente",
    "Extra content at the end of the document": "Conteúdo extra no final do documento",
    "Premature end of data": "Fim prematuro dos dados",
    "Mismatched tag": "Tag não corresponde",
    "Unterminated": "Não terminado",
    "entity": "entidade",
    "attribute": "atributo",
    "element": "elemento",
    "tag": "tag",
  };
  
  let translated = errorMsg;
  
  // Aplicar traduções
  Object.keys(translations).forEach((key) => {
    const regex = new RegExp(key, "gi");
    translated = translated.replace(regex, translations[key]);
  });
  
  // Traduzir padrões comuns
  translated = translated.replace(/error on line (\d+) at column (\d+)/gi, "erro na linha $1, coluna $2");
  translated = translated.replace(/line (\d+)/gi, "linha $1");
  translated = translated.replace(/column (\d+)/gi, "coluna $1");
  
  return translated.trim() || "XML inválido. Verifique a sintaxe.";
};

const formatXML = (xmlString, indentSize = 2) => {
  if (!xmlString || !xmlString.trim()) return "";

  // Remove espaços extras e quebras de linha desnecessárias
  let formatted = xmlString.trim().replace(/>\s+</g, "><");

  // Tratar comentários XML problemáticos (que contêm '--')
  // Comentários XML válidos: <!-- comentário -->
  // Mas não podem conter '--' no meio
  formatted = formatted.replace(/<!--([\s\S]*?)-->/g, (match, content) => {
    // Se o comentário contém '--', substituir por espaço ou remover
    if (content.includes('--')) {
      // Substituir '--' por ' - ' para tornar válido
      const fixedContent = content.replace(/--/g, ' - ');
      return `<!--${fixedContent}-->`;
    }
    return match;
  });

  // Validação básica de XML
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(formatted, "text/xml");
  const parseError = xmlDoc.querySelector("parsererror");

  if (parseError) {
    // Extrair mensagem de erro mais limpa
    let errorMsg = parseError.textContent || "Erro desconhecido";
    
    // Limpar mensagem de erro do DOMParser
    errorMsg = errorMsg.replace(/This page contains the following errors:/gi, "");
    errorMsg = errorMsg.replace(/Below is a rendering of the page up to the first error\./gi, "");
    errorMsg = errorMsg.trim();
    
    // Traduzir mensagem de erro para português
    errorMsg = translateXMLError(errorMsg);
    
    throw new Error(errorMsg);
  }

  // Função recursiva para formatar nós
  const formatNode = (node, level = 0) => {
    const indent = " ".repeat(level * indentSize);
    
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName;
      const attributes = Array.from(node.attributes)
        .map((attr) => ` ${attr.name}="${attr.value}"`)
        .join("");

      const childElements = Array.from(node.childNodes).filter(
        (child) => child.nodeType === Node.ELEMENT_NODE
      );
      const textNodes = Array.from(node.childNodes).filter(
        (child) => child.nodeType === Node.TEXT_NODE && child.textContent.trim()
      );

      // Elemento vazio
      if (childElements.length === 0 && textNodes.length === 0) {
        return `${indent}<${tagName}${attributes} />\n`;
      }

      // Elemento com apenas texto
      if (childElements.length === 0 && textNodes.length > 0) {
        const textContent = textNodes.map((n) => n.textContent.trim()).join(" ");
        return `${indent}<${tagName}${attributes}>${textContent}</${tagName}>\n`;
      }

      // Elemento com filhos
      let result = `${indent}<${tagName}${attributes}>\n`;
      
      // Adicionar texto antes dos elementos filhos, se houver
      if (textNodes.length > 0) {
        const textContent = textNodes.map((n) => n.textContent.trim()).join(" ");
        result += `${" ".repeat((level + 1) * indentSize)}${textContent}\n`;
      }

      // Formatar elementos filhos
      childElements.forEach((child) => {
        result += formatNode(child, level + 1);
      });

      result += `${indent}</${tagName}>\n`;
      return result;
    }

    return "";
  };

  // Formatar o elemento raiz
  const root = xmlDoc.documentElement;
  const rootTag = root.tagName;
  const rootAttrs = Array.from(root.attributes)
    .map((attr) => ` ${attr.name}="${attr.value}"`)
    .join("");

  const childElements = Array.from(root.childNodes).filter(
    (child) => child.nodeType === Node.ELEMENT_NODE
  );
  const textNodes = Array.from(root.childNodes).filter(
    (child) => child.nodeType === Node.TEXT_NODE && child.textContent.trim()
  );

  // Raiz vazia
  if (childElements.length === 0 && textNodes.length === 0) {
    return `<${rootTag}${rootAttrs} />\n`;
  }

  // Raiz com apenas texto
  if (childElements.length === 0 && textNodes.length > 0) {
    const textContent = textNodes.map((n) => n.textContent.trim()).join(" ");
    return `<${rootTag}${rootAttrs}>${textContent}</${rootTag}>\n`;
  }

  // Raiz com filhos
  let result = `<${rootTag}${rootAttrs}>\n`;
  
  if (textNodes.length > 0) {
    const textContent = textNodes.map((n) => n.textContent.trim()).join(" ");
    result += `${" ".repeat(indentSize)}${textContent}\n`;
  }

  childElements.forEach((child) => {
    result += formatNode(child, 1);
  });

  result += `</${rootTag}>\n`;
  return result.trim();
};

const processXml = () => {
  const raw = xmlInputEl.value;
  if (!raw.trim()) {
    xmlOutputEl.value = "";
    xmlOutputEl.classList.remove("text-input--error");
    return;
  }

  try {
    const indentSize = parseInt(xmlIndentEl.value, 10);
    const formatted = formatXML(raw, indentSize);
    xmlOutputEl.value = formatted;
    xmlOutputEl.classList.remove("text-input--error");
    updateStats(xmlOutputEl, document.getElementById("xmlOutputStats"));
    saveToHistory("xml", raw, formatted, { indent: xmlIndentEl.value });
  } catch (e) {
    xmlOutputEl.value = `Erro: ${e.message}`;
    xmlOutputEl.classList.add("text-input--error");
    showToast("XML inválido. Verifique a sintaxe.", "error");
  }
};

let xmlDebounceId;
const scheduleXmlProcess = () => {
  window.clearTimeout(xmlDebounceId);
  xmlDebounceId = window.setTimeout(processXml, 300);
};

xmlInputEl.addEventListener("input", scheduleXmlProcess);
xmlIndentEl.addEventListener("change", processXml);

xmlCopyBtn.addEventListener("click", async () => {
  if (!xmlOutputEl.value.trim() || xmlOutputEl.classList.contains("text-input--error")) {
    showToast("Nada para copiar ou XML inválido", "info");
    return;
  }
  try {
    const ok = await copyTextToClipboard(xmlOutputEl.value);
    if (!ok) throw new Error("Clipboard not available");
    showToast("XML copiado com sucesso!", "success");
  } catch (e) {
    console.error("Não foi possível copiar:", e);
    showToast("Erro ao copiar", "error");
  }
});

xmlResetBtn.addEventListener("click", () => {
  xmlInputEl.value = "";
  xmlOutputEl.value = "";
  xmlIndentEl.value = "2";
  xmlOutputEl.classList.remove("text-input--error");
  updateStats(xmlInputEl, document.getElementById("xmlInputStats"));
  updateStats(xmlOutputEl, document.getElementById("xmlOutputStats"));
  xmlInputEl.focus();
  processXml();
});

const xmlFavoriteBtn = document.getElementById("xmlFavoriteBtn");
if (xmlFavoriteBtn) {
  xmlFavoriteBtn.addEventListener("click", () => {
    if (!xmlOutputEl.value.trim() || xmlOutputEl.classList.contains("text-input--error")) {
      showToast("Formate um XML válido primeiro", "info");
      return;
    }
    if (typeof window.openFavoriteFromCurrent === "function") {
      window.openFavoriteFromCurrent("xml", xmlInputEl.value, xmlOutputEl.value, { indent: xmlIndentEl.value });
    }
  });
}

// ============================================
// FORMATADOR JSON
// ============================================

const jsonInputEl = document.getElementById("jsonInput");
const jsonOutputEl = document.getElementById("jsonOutput");
const jsonCopyBtn = document.getElementById("jsonCopyBtn");
const jsonResetBtn = document.getElementById("jsonResetBtn");
const jsonFormatEl = document.getElementById("jsonFormat");

// Função para traduzir mensagens de erro do JSON
const translateJSONError = (errorMsg) => {
  if (!errorMsg) return "JSON inválido. Verifique a sintaxe.";
  
  // Traduzir mensagens comuns do JSON.parse
  const translations = {
    "Unexpected token": "Token inesperado",
    "Unexpected end of JSON input": "Fim inesperado da entrada JSON",
    "Unexpected string in JSON": "String inesperada no JSON",
    "Unexpected number in JSON": "Número inesperado no JSON",
    "Unexpected boolean in JSON": "Booleano inesperado no JSON",
    "Unexpected null in JSON": "Null inesperado no JSON",
    "Expected property name": "Nome de propriedade esperado",
    "Expected ':'": "Esperado ':'",
    "Expected ',' or '}'": "Esperado ',' ou '}'",
    "Expected ',' or ']'": "Esperado ',' ou ']'",
    "Bad control character": "Caractere de controle inválido",
    "Bad escaped character": "Caractere escapado inválido",
    "Unterminated string": "String não terminada",
    "Unterminated comment": "Comentário não terminado",
    "Invalid number": "Número inválido",
    "No data": "Sem dados",
    "position": "posição",
    "at position": "na posição",
    "at line": "na linha",
    "column": "coluna",
  };
  
  let translated = errorMsg;
  
  // Aplicar traduções
  Object.keys(translations).forEach((key) => {
    const regex = new RegExp(key, "gi");
    translated = translated.replace(regex, translations[key]);
  });
  
  // Traduzir padrões comuns com números
  translated = translated.replace(/at position (\d+)/gi, "na posição $1");
  translated = translated.replace(/at line (\d+)/gi, "na linha $1");
  translated = translated.replace(/column (\d+)/gi, "coluna $1");
  
  return translated.trim() || "JSON inválido. Verifique a sintaxe.";
};

const formatJSON = (jsonString) => {
  if (!jsonString || !jsonString.trim()) return "";

  try {
    const parsed = JSON.parse(jsonString);
    return JSON.stringify(parsed, null, 2);
  } catch (e) {
    const translatedError = translateJSONError(e.message);
    throw new Error(translatedError);
  }
};

const minifyJSON = (jsonString) => {
  if (!jsonString || !jsonString.trim()) return "";

  try {
    const parsed = JSON.parse(jsonString);
    return JSON.stringify(parsed);
  } catch (e) {
    const translatedError = translateJSONError(e.message);
    throw new Error(translatedError);
  }
};

const processJson = () => {
  const raw = jsonInputEl.value;
  if (!raw.trim()) {
    jsonOutputEl.value = "";
    jsonOutputEl.classList.remove("text-input--error");
    return;
  }

  try {
    const formatType = jsonFormatEl.value;
    let result;
    
    if (formatType === "minified") {
      result = minifyJSON(raw);
    } else {
      result = formatJSON(raw);
    }
    
    jsonOutputEl.value = result;
    jsonOutputEl.classList.remove("text-input--error");
    updateStats(jsonOutputEl, document.getElementById("jsonOutputStats"));
    saveToHistory("json", raw, result, { format: jsonFormatEl.value });
  } catch (e) {
    jsonOutputEl.value = `Erro: ${e.message}`;
    jsonOutputEl.classList.add("text-input--error");
    showToast("JSON inválido. Verifique a sintaxe.", "error");
  }
};

let jsonDebounceId;
const scheduleJsonProcess = () => {
  window.clearTimeout(jsonDebounceId);
  jsonDebounceId = window.setTimeout(processJson, 300);
};

jsonInputEl.addEventListener("input", scheduleJsonProcess);
jsonFormatEl.addEventListener("change", processJson);

jsonCopyBtn.addEventListener("click", async () => {
  if (!jsonOutputEl.value.trim() || jsonOutputEl.classList.contains("text-input--error")) {
    showToast("Nada para copiar ou JSON inválido", "info");
    return;
  }
  try {
    const ok = await copyTextToClipboard(jsonOutputEl.value);
    if (!ok) throw new Error("Clipboard not available");
    showToast("JSON copiado com sucesso!", "success");
  } catch (e) {
    console.error("Não foi possível copiar:", e);
    showToast("Erro ao copiar", "error");
  }
});

jsonResetBtn.addEventListener("click", () => {
  jsonInputEl.value = "";
  jsonOutputEl.value = "";
  jsonFormatEl.value = "formatted";
  jsonOutputEl.classList.remove("text-input--error");
  updateStats(jsonInputEl, document.getElementById("jsonInputStats"));
  updateStats(jsonOutputEl, document.getElementById("jsonOutputStats"));
  jsonInputEl.focus();
  processJson();
});

const jsonFavoriteBtn = document.getElementById("jsonFavoriteBtn");
if (jsonFavoriteBtn) {
  jsonFavoriteBtn.addEventListener("click", () => {
    if (!jsonOutputEl.value.trim() || jsonOutputEl.classList.contains("text-input--error")) {
      showToast("Formate um JSON válido primeiro", "info");
      return;
    }
    if (typeof window.openFavoriteFromCurrent === "function") {
      window.openFavoriteFromCurrent("json", jsonInputEl.value, jsonOutputEl.value, { format: jsonFormatEl.value });
    }
  });
}

// ============================================
// HISTÓRICO LOCAL (HistoryManager)
// ============================================

const TOOL_KEY_TO_ID = {
  sql: "formatador-sql",
  xml: "formatador-xml",
  json: "formatador-json",
  password: "gerador-senhas",
  fake: "dados-fake",
  qrcode: "gerador-qrcode",
  uuid: "gerador-uuid",
};

function saveToHistory(toolKey, input, output, config) {
  if (typeof HistoryManager === "undefined") return;
  const toolId = TOOL_KEY_TO_ID[toolKey] || toolKey;
  HistoryManager.saveToHistory(toolId, input, output, config || {});
}

// ============================================
// GERADOR DE SENHAS
// ============================================

const passwordOutputEl = document.getElementById("passwordOutput");
const passwordCopyBtn = document.getElementById("passwordCopyBtn");
const passwordGenerateBtn = document.getElementById("passwordGenerateBtn");
const passwordLengthEl = document.getElementById("passwordLength");
const passwordLengthValueEl = document.getElementById("passwordLengthValue");
const passwordUppercaseEl = document.getElementById("passwordUppercase");
const passwordLowercaseEl = document.getElementById("passwordLowercase");
const passwordNumbersEl = document.getElementById("passwordNumbers");
const passwordSymbolsEl = document.getElementById("passwordSymbols");
const passwordStrengthEl = document.getElementById("passwordStrength");
const passwordStrengthLabelEl = document.getElementById("passwordStrengthLabel");

const CHARACTER_SETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?/~`",
};

const generatePassword = () => {
  const length = parseInt(passwordLengthEl.value, 10);
  const useUppercase = passwordUppercaseEl.checked;
  const useLowercase = passwordLowercaseEl.checked;
  const useNumbers = passwordNumbersEl.checked;
  const useSymbols = passwordSymbolsEl.checked;

  // Verificar se pelo menos um tipo está selecionado
  if (!useUppercase && !useLowercase && !useNumbers && !useSymbols) {
    showToast("Selecione pelo menos um tipo de caractere", "error");
    return "";
  }

  // Construir conjunto de caracteres disponíveis
  let availableChars = "";
  if (useUppercase) availableChars += CHARACTER_SETS.uppercase;
  if (useLowercase) availableChars += CHARACTER_SETS.lowercase;
  if (useNumbers) availableChars += CHARACTER_SETS.numbers;
  if (useSymbols) availableChars += CHARACTER_SETS.symbols;

  // Garantir que pelo menos um caractere de cada tipo selecionado seja usado
  let password = "";
  if (useUppercase) {
    password += CHARACTER_SETS.uppercase[Math.floor(Math.random() * CHARACTER_SETS.uppercase.length)];
  }
  if (useLowercase) {
    password += CHARACTER_SETS.lowercase[Math.floor(Math.random() * CHARACTER_SETS.lowercase.length)];
  }
  if (useNumbers) {
    password += CHARACTER_SETS.numbers[Math.floor(Math.random() * CHARACTER_SETS.numbers.length)];
  }
  if (useSymbols) {
    password += CHARACTER_SETS.symbols[Math.floor(Math.random() * CHARACTER_SETS.symbols.length)];
  }

  // Preencher o resto da senha com caracteres aleatórios
  const remainingLength = length - password.length;
  for (let i = 0; i < remainingLength; i++) {
    password += availableChars[Math.floor(Math.random() * availableChars.length)];
  }

  // Embaralhar a senha para evitar padrões previsíveis
  password = password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");

  return password;
};

const calculatePasswordStrength = (password) => {
  if (!password) return { level: "very-weak", label: "Muito fraca" };

  let score = 0;
  const length = password.length;

  // Pontuação por comprimento
  if (length >= 4) score += 1;
  if (length >= 8) score += 1;
  if (length >= 12) score += 1;
  if (length >= 16) score += 1;
  if (length >= 20) score += 1;

  // Pontuação por tipos de caracteres
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  // Bônus por variedade
  const uniqueChars = new Set(password).size;
  if (uniqueChars / length > 0.7) score += 1;

  // Determinar nível de força
  if (score <= 2) return { level: "very-weak", label: "Muito fraca" };
  if (score <= 4) return { level: "weak", label: "Fraca" };
  if (score <= 6) return { level: "good", label: "Boa" };
  if (score <= 8) return { level: "strong", label: "Forte" };
  return { level: "very-strong", label: "Muito forte" };
};

const updatePasswordStrength = (password) => {
  const strength = calculatePasswordStrength(password);
  passwordStrengthEl.setAttribute("data-strength", strength.level);
  passwordStrengthLabelEl.textContent = strength.label;
};

const updatePassword = () => {
  const password = generatePassword();
  passwordOutputEl.value = password;
  updatePasswordStrength(password);
};

const updatePasswordLength = () => {
  passwordLengthValueEl.textContent = passwordLengthEl.value;
  updatePassword();
};

passwordLengthEl.addEventListener("input", updatePasswordLength);
passwordUppercaseEl.addEventListener("change", updatePassword);
passwordLowercaseEl.addEventListener("change", updatePassword);
passwordNumbersEl.addEventListener("change", updatePassword);
passwordSymbolsEl.addEventListener("change", updatePassword);

passwordGenerateBtn.addEventListener("click", () => {
  updatePassword();
  const pwd = passwordOutputEl.value;
  if (pwd) {
    const config = {
      length: passwordLengthEl.value,
      uppercase: passwordUppercaseEl.checked,
      lowercase: passwordLowercaseEl.checked,
      numbers: passwordNumbersEl.checked,
      symbols: passwordSymbolsEl.checked,
    };
    saveToHistory("password", "", pwd, config);
  }
});

passwordCopyBtn.addEventListener("click", async () => {
  const password = passwordOutputEl.value;
  if (!password) {
    showToast("Gere uma senha primeiro", "info");
    return;
  }
  try {
    const ok = await copyTextToClipboard(password);
    if (!ok) throw new Error("Clipboard not available");
    showToast("Senha copiada com sucesso!", "success");
  } catch (e) {
    console.error("Não foi possível copiar:", e);
    showToast("Erro ao copiar", "error");
  }
});

const passwordFavoriteBtn = document.getElementById("passwordFavoriteBtn");
if (passwordFavoriteBtn) {
  passwordFavoriteBtn.addEventListener("click", () => {
    const pwd = passwordOutputEl.value;
    if (!pwd) {
      showToast("Gere uma senha primeiro", "info");
      return;
    }
    if (typeof window.openFavoriteFromCurrent === "function") {
      window.openFavoriteFromCurrent("password", "", pwd, {
        length: passwordLengthEl.value,
        uppercase: passwordUppercaseEl.checked,
        lowercase: passwordLowercaseEl.checked,
        numbers: passwordNumbersEl.checked,
        symbols: passwordSymbolsEl.checked,
      });
    }
  });
}

// Gerar senha inicial ao carregar
updatePassword();

// ============================================
// GERADOR DE DADOS FAKE
// ============================================

const fakeTypeEl = document.getElementById("fakeType");
const personOptionsEl = document.getElementById("personOptions");
const companyOptionsEl = document.getElementById("companyOptions");
const fakeGenerateBtn = document.getElementById("fakeGenerateBtn");
const fakeCopyJsonBtn = document.getElementById("fakeCopyJsonBtn");
const fakeResultsEl = document.getElementById("fakeResults");

// Dados para geração
const FIRST_NAMES_MALE = [
  "João", "Pedro", "Carlos", "Lucas", "Gabriel", "Rafael", "Felipe", "Bruno",
  "André", "Thiago", "Marcos", "Paulo", "Ricardo", "Daniel", "Rodrigo", "Fernando",
  "Eduardo", "Gustavo", "Leonardo", "Matheus", "Vinicius", "Henrique", "Diego", "Renato"
];

const FIRST_NAMES_FEMALE = [
  "Maria", "Ana", "Juliana", "Fernanda", "Patricia", "Mariana", "Camila", "Amanda",
  "Bruna", "Beatriz", "Carolina", "Larissa", "Vanessa", "Tatiana", "Priscila", "Renata",
  "Cristina", "Daniela", "Gabriela", "Isabela", "Leticia", "Luciana", "Monica", "Sandra"
];

const LAST_NAMES = [
  "Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira",
  "Lima", "Gomes", "Ribeiro", "Carvalho", "Almeida", "Martins", "Costa", "Monteiro",
  "Cardoso", "Teixeira", "Mendes", "Araujo", "Barbosa", "Dias", "Moreira", "Cavalcanti"
];

const COMPANY_TYPES = [
  "LTDA", "EIRELI", "ME", "EPP", "SA"
];

const COMPANY_ACTIVITIES = [
  "Tecnologia", "Comércio", "Serviços", "Indústria", "Construção", "Alimentação",
  "Transporte", "Consultoria", "Educação", "Saúde", "Beleza", "Moda"
];

const STREET_TYPES = [
  "Rua", "Avenida", "Travessa", "Praça", "Alameda", "Viela", "Estrada", "Rodovia"
];

const STREET_NAMES = [
  "das Flores", "do Comércio", "Principal", "da Paz", "Brasil", "São Paulo",
  "Rio de Janeiro", "das Palmeiras", "Central", "Nova", "Velha", "do Sol",
  "da Lua", "dos Bandeirantes", "Independência", "Liberdade"
];

const NEIGHBORHOODS = [
  "Centro", "Jardim das Flores", "Vila Nova", "Bela Vista", "São José",
  "Santa Maria", "Nova Esperança", "Parque Industrial", "Residencial", "Alto"
];

// Funções auxiliares
const randomItem = (array) => array[Math.floor(Math.random() * array.length)];
const randomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Gerar CPF válido (apenas sintaticamente, não verifica existência)
const generateCPFSyntax = (withPunctuation = true) => {
  // Usar prefixos menos comuns para reduzir chance de CPFs reais
  // CPFs começando com 0 são menos comuns em CPFs reais (geralmente são de estados específicos)
  const n1 = randomNumber(0, 1); // Reduzir chance de CPFs reais
  const n2 = randomNumber(0, 9);
  const n3 = randomNumber(0, 9);
  const n4 = randomNumber(0, 9);
  const n5 = randomNumber(0, 9);
  const n6 = randomNumber(0, 9);
  const n7 = randomNumber(0, 9);
  const n8 = randomNumber(0, 9);
  const n9 = randomNumber(0, 9);

  let d1 = n9 * 2 + n8 * 3 + n7 * 4 + n6 * 5 + n5 * 6 + n4 * 7 + n3 * 8 + n2 * 9 + n1 * 10;
  d1 = 11 - (d1 % 11);
  if (d1 >= 10) d1 = 0;

  let d2 = d1 * 2 + n9 * 3 + n8 * 4 + n7 * 5 + n6 * 6 + n5 * 7 + n4 * 8 + n3 * 9 + n2 * 10;
  d2 = 11 - (d2 % 11);
  if (d2 >= 10) d2 = 0;

  const cpf = `${n1}${n2}${n3}${n4}${n5}${n6}${n7}${n8}${n9}${d1}${d2}`;
  return {
    raw: cpf,
    formatted: withPunctuation ? `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}` : cpf
  };
};

// Verificar se CPF existe na base real (tentativa com API pública)
// Nota: APIs públicas de CPF geralmente requerem autenticação, então esta é uma tentativa
const checkCPFExists = async (cpf) => {
  try {
    const cleanCPF = cpf.replace(/\D/g, "");
    
    // Tentar usar API pública se disponível (algumas APIs podem funcionar sem auth para validação básica)
    // Usando uma abordagem conservadora: assumir que não existe se não conseguir verificar
    // Isso evita gerar CPFs reais quando possível
    
    // Verificação básica: CPFs com todos os dígitos iguais são inválidos
    if (/^(\d)\1{10}$/.test(cleanCPF)) {
      return false;
    }
    
    // Por enquanto, retornar false (não existe) para não bloquear
    // Em produção, você poderia integrar com uma API de validação se tiver acesso
    return false;
  } catch (error) {
    console.warn("Erro ao verificar CPF:", error);
    return false;
  }
};

// Gerar CPF que não existe na base real
const generateCPF = async (withPunctuation = true, maxAttempts = 5) => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const cpfData = generateCPFSyntax(withPunctuation);
    const exists = await checkCPFExists(cpfData.raw);
    
    if (!exists) {
      return cpfData.formatted;
    }
    
    // Se existe, tentar novamente
    await new Promise(resolve => setTimeout(resolve, 50)); // Pequeno delay
  }
  
  // Se após várias tentativas ainda encontrar CPFs existentes, retornar o último gerado
  const cpfData = generateCPFSyntax(withPunctuation);
  return cpfData.formatted;
};

// Gerar CNPJ válido (apenas sintaticamente, não verifica existência)
const generateCNPJSyntax = (withPunctuation = true) => {
  // Usar prefixos que raramente são usados em CNPJs reais para reduzir chance de colisão
  // Prefixos começando com 00 são menos comuns em CNPJs reais
  const n1 = randomNumber(0, 1); // Reduzir chance de CNPJs reais
  const n2 = randomNumber(0, 9);
  const n3 = randomNumber(0, 9);
  const n4 = randomNumber(0, 9);
  const n5 = randomNumber(0, 9);
  const n6 = randomNumber(0, 9);
  const n7 = randomNumber(0, 9);
  const n8 = randomNumber(0, 9);
  const n9 = randomNumber(0, 2); // Usar valores menores para reduzir chance
  const n10 = randomNumber(0, 2);
  const n11 = randomNumber(0, 2);
  const n12 = randomNumber(0, 2);

  let d1 = n12 * 2 + n11 * 3 + n10 * 4 + n9 * 5 + n8 * 6 + n7 * 7 + n6 * 8 + n5 * 9 + n4 * 2 + n3 * 3 + n2 * 4 + n1 * 5;
  d1 = 11 - (d1 % 11);
  if (d1 >= 10) d1 = 0;

  let d2 = d1 * 2 + n12 * 3 + n11 * 4 + n10 * 5 + n9 * 6 + n8 * 7 + n7 * 8 + n6 * 9 + n5 * 2 + n4 * 3 + n3 * 4 + n2 * 5 + n1 * 6;
  d2 = 11 - (d2 % 11);
  if (d2 >= 10) d2 = 0;

  const cnpj = `${n1}${n2}${n3}${n4}${n5}${n6}${n7}${n8}${n9}${n10}${n11}${n12}${d1}${d2}`;
  return {
    raw: cnpj,
    formatted: withPunctuation ? `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}` : cnpj
  };
};

const CNPJ_ALPHANUM_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const randomFromString = (str) => str[Math.floor(Math.random() * str.length)];

// Gerar CNPJ alfanumérico (apenas estrutural: 12 alfanuméricos + 2 dígitos)
const generateCNPJAlphaSyntax = (withPunctuation = true) => {
  let base12 = "";
  for (let i = 0; i < 12; i++) base12 += randomFromString(CNPJ_ALPHANUM_CHARS);

  const d1 = String(randomNumber(0, 9));
  const d2 = String(randomNumber(0, 9));
  const cnpj = (base12 + d1 + d2).toUpperCase();

  return {
    raw: cnpj,
    formatted: withPunctuation ? `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}` : cnpj,
  };
};

// Verificar se CNPJ existe na base real usando API
const checkCNPJExists = async (cnpj) => {
  try {
    // Para CNPJ alfanumérico (novo), não consultar BrasilAPI (compat/segurança)
    const raw = String(cnpj ?? "");
    if (/[A-Za-z]/.test(raw)) return false;

    // Usar API gratuita da ReceitaWS ou BrasilAPI (somente CNPJ numérico)
    const cleanCNPJ = raw.replace(/\D/g, "");
    if (cleanCNPJ.length !== 14) return false;
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    // Se retornar 200, o CNPJ existe
    if (response.ok) {
      const data = await response.json();
      // Se tem razão social, significa que existe
      return data.razao_social ? true : false;
    }

    // Se retornar 404 ou erro, não existe
    return false;
  } catch (error) {
    // Em caso de erro na API, assumir que não existe para não bloquear
    console.warn("Erro ao verificar CNPJ:", error);
    return false;
  }
};

// Gerar CNPJ que não existe na base real
const generateCNPJ = async (withPunctuation = true, mode = "numeric", maxAttempts = 10) => {
  if (mode === "alphanumeric") {
    // Não valida existência por API: geração estrutural e não-bloqueante
    return generateCNPJAlphaSyntax(withPunctuation).formatted;
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const cnpjData = generateCNPJSyntax(withPunctuation);
    const exists = await checkCNPJExists(cnpjData.raw);
    
    if (!exists) {
      return cnpjData.formatted;
    }
    
    // Se existe, tentar novamente
    await new Promise(resolve => setTimeout(resolve, 100)); // Pequeno delay para não sobrecarregar API
  }
  
  // Se após várias tentativas ainda encontrar CNPJs existentes, retornar o último gerado
  // (caso raro, mas melhor que travar)
  const cnpjData = generateCNPJSyntax(withPunctuation);
  return cnpjData.formatted;
};

// Gerar CEP
const generateCEP = (withPunctuation = true) => {
  const cep = String(randomNumber(10000, 99999)) + String(randomNumber(100, 999));
  return withPunctuation ? `${cep.slice(0, 5)}-${cep.slice(5)}` : cep;
};

// Gerar RG
const generateRG = (withPunctuation = true) => {
  const rg = String(randomNumber(1000000, 999999999));
  return withPunctuation ? `${rg.slice(0, 2)}.${rg.slice(2, 5)}.${rg.slice(5, 8)}-${rg.slice(8)}` : rg;
};

// Gerar Inscrição Estadual
const generateIE = (state, withPunctuation = true) => {
  const digits = randomNumber(10000000, 999999999);
  const ie = String(digits).padStart(12, "0");
  return withPunctuation ? `${ie.slice(0, 3)}.${ie.slice(3, 6)}.${ie.slice(6, 9)}.${ie.slice(9)}` : ie;
};

// Gerar email
const generateEmail = (name) => {
  const domains = ["gmail.com", "hotmail.com", "yahoo.com.br", "outlook.com", "uol.com.br"];
  const cleanName = name.toLowerCase().replace(/\s+/g, ".");
  return `${cleanName}@${randomItem(domains)}`;
};

// Gerar telefone
const generatePhone = (withPunctuation = true) => {
  const area = randomNumber(11, 99);
  const number = String(randomNumber(10000000, 99999999));
  return withPunctuation ? `(${area}) ${number.slice(0, 4)}-${number.slice(4)}` : `${area}${number}`;
};

// Gerar celular
const generateCellphone = (withPunctuation = true) => {
  const area = randomNumber(11, 99);
  const number = "9" + String(randomNumber(10000000, 99999999));
  return withPunctuation ? `(${area}) ${number.slice(0, 5)}-${number.slice(5)}` : `${area}${number}`;
};

// Gerar data de nascimento
const generateBirthDate = (age = null) => {
  const targetAge = age || randomNumber(18, 80);
  const today = new Date();
  const birthYear = today.getFullYear() - targetAge;
  const birthMonth = randomNumber(1, 12);
  const daysInMonth = new Date(birthYear, birthMonth, 0).getDate();
  const birthDay = randomNumber(1, daysInMonth);
  return `${String(birthDay).padStart(2, "0")}/${String(birthMonth).padStart(2, "0")}/${birthYear}`;
};

// Gerar data de abertura (empresa)
const generateOpeningDate = (yearsAgo) => {
  const today = new Date();
  const openingYear = today.getFullYear() - yearsAgo;
  const openingMonth = randomNumber(1, 12);
  const daysInMonth = new Date(openingYear, openingMonth, 0).getDate();
  const openingDay = randomNumber(1, daysInMonth);
  return `${String(openingDay).padStart(2, "0")}/${String(openingMonth).padStart(2, "0")}/${openingYear}`;
};

// Gerar pessoa
const generatePerson = async () => {
  const gender = document.getElementById("personGender").value === "random" 
    ? (Math.random() > 0.5 ? "male" : "female")
    : document.getElementById("personGender").value;
  const age = parseInt(document.getElementById("personAge").value) || randomNumber(18, 80);
  const state = document.getElementById("personState").value || randomItem(["SP", "RJ", "MG", "RS", "PR"]);
  const withPunctuation = document.getElementById("personPunctuation").value === "true";

  const firstName = gender === "male" ? randomItem(FIRST_NAMES_MALE) : randomItem(FIRST_NAMES_FEMALE);
  const lastName = randomItem(LAST_NAMES) + " " + randomItem(LAST_NAMES);
  const fullName = `${firstName} ${lastName}`;

  // Gerar CPF que não existe na base real
  const cpf = await generateCPF(withPunctuation);

  return {
    nome: fullName,
    cpf: cpf,
    rg: generateRG(withPunctuation),
    dataNascimento: generateBirthDate(age),
    sexo: gender === "male" ? "Masculino" : "Feminino",
    email: generateEmail(firstName + "." + lastName.split(" ")[0]),
    cep: generateCEP(withPunctuation),
    endereco: `${randomItem(STREET_TYPES)} ${randomItem(STREET_NAMES)}, ${randomNumber(1, 9999)}`,
    bairro: randomItem(NEIGHBORHOODS),
    cidade: "São Paulo", // Simplificado - poderia ter lista por estado
    estado: state,
    telefone: generatePhone(withPunctuation),
    celular: generateCellphone(withPunctuation),
  };
};

// Gerar empresa
const generateCompany = async () => {
  const state = document.getElementById("companyState").value;
  const yearsAgo = parseInt(document.getElementById("companyYears").value);
  const withPunctuation = document.getElementById("companyPunctuation").value === "true";
  const modeEl = document.getElementById("companyCnpjMode");
  const cnpjMode = modeEl ? modeEl.value : "numeric";

  const activity = randomItem(COMPANY_ACTIVITIES);
  const companyName = `${randomItem(LAST_NAMES)} ${activity} ${randomItem(COMPANY_TYPES)}`;
  const fantasyName = `${activity} ${randomItem(["Plus", "Premium", "Express", "Solutions", "Group"])}`;

  // Gerar CNPJ que não existe na base real
  const cnpj = await generateCNPJ(withPunctuation, cnpjMode);

  return {
    nome: companyName,
    nomeFantasia: fantasyName,
    cnpj: cnpj,
    inscricaoEstadual: generateIE(state, withPunctuation),
    dataAbertura: generateOpeningDate(yearsAgo),
    site: `www.${fantasyName.toLowerCase().replace(/\s+/g, "")}.com.br`,
    email: `contato@${fantasyName.toLowerCase().replace(/\s+/g, "")}.com.br`,
    cep: generateCEP(withPunctuation),
    endereco: `${randomItem(STREET_TYPES)} ${randomItem(STREET_NAMES)}, ${randomNumber(1, 9999)}`,
    numero: String(randomNumber(1, 9999)),
    bairro: randomItem(NEIGHBORHOODS),
    cidade: "São Paulo", // Simplificado
    estado: state,
    telefone: generatePhone(withPunctuation),
    celular: generateCellphone(withPunctuation),
  };
};

// Renderizar resultados
const renderResults = (data) => {
  fakeResultsEl.innerHTML = "";
  Object.entries(data).forEach(([key, value]) => {
    const item = document.createElement("div");
    item.className = "fake-result-item";

    const label = document.createElement("div");
    label.className = "fake-result-item__label";
    label.textContent = String(key ?? "");

    const valueWrap = document.createElement("div");
    valueWrap.className = "fake-result-item__value";

    const valueSpan = document.createElement("span");
    valueSpan.textContent = String(value ?? "");

    const copyBtn = document.createElement("button");
    copyBtn.className = "fake-result-item__copy";
    copyBtn.type = "button";
    copyBtn.dataset.value = String(value ?? "");
    copyBtn.textContent = "Copiar";

    valueWrap.appendChild(valueSpan);
    valueWrap.appendChild(copyBtn);
    item.appendChild(label);
    item.appendChild(valueWrap);
    fakeResultsEl.appendChild(item);
  });

  // Adicionar listeners de cópia
  fakeResultsEl.querySelectorAll(".fake-result-item__copy").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const value = btn.dataset.value;
      try {
        const ok = await copyTextToClipboard(value);
        if (!ok) throw new Error("Clipboard not available");
        showToast("Copiado com sucesso!", "success");
      } catch (e) {
        showToast("Erro ao copiar", "error");
      }
    });
  });
};

// Alternar entre Pessoa e Empresa
fakeTypeEl.addEventListener("change", () => {
  const type = fakeTypeEl.value;
  if (type === "person") {
    personOptionsEl.style.display = "block";
    companyOptionsEl.style.display = "none";
  } else {
    personOptionsEl.style.display = "none";
    companyOptionsEl.style.display = "block";
  }
});

// Gerar dados
fakeGenerateBtn.addEventListener("click", async () => {
  const type = fakeTypeEl.value;
  
  // Desabilitar botão durante geração
  fakeGenerateBtn.disabled = true;
  fakeGenerateBtn.textContent = "Gerando...";
  
  try {
    const data = type === "person" ? await generatePerson() : await generateCompany();
    renderResults(data);
    window.fakeData = data; // Armazenar para copiar JSON
    const outputStr = JSON.stringify(data, null, 2);
    const modeEl = type === "company" ? document.getElementById("companyCnpjMode") : null;
    const cnpjMode = modeEl ? modeEl.value : "numeric";
    saveToHistory("fake", "", outputStr, type === "company" ? { type, cnpjMode } : { type });
  } catch (error) {
    console.error("Erro ao gerar dados:", error);
    showToast("Erro ao gerar dados. Tente novamente.", "error");
  } finally {
    fakeGenerateBtn.disabled = false;
    fakeGenerateBtn.textContent = "Gerar Dados";
  }
});

// Copiar JSON
fakeCopyJsonBtn.addEventListener("click", async () => {
  if (!window.fakeData) {
    showToast("Gere dados primeiro", "info");
    return;
  }
  try {
    const ok = await copyTextToClipboard(JSON.stringify(window.fakeData, null, 2));
    if (!ok) throw new Error("Clipboard not available");
    showToast("JSON copiado com sucesso!", "success");
  } catch (e) {
    showToast("Erro ao copiar", "error");
  }
});

const fakeFavoriteBtn = document.getElementById("fakeFavoriteBtn");
if (fakeFavoriteBtn) {
  fakeFavoriteBtn.addEventListener("click", () => {
    if (!window.fakeData) {
      showToast("Gere dados primeiro", "info");
      return;
    }
    if (typeof window.openFavoriteFromCurrent === "function") {
      window.openFavoriteFromCurrent("fake", "", JSON.stringify(window.fakeData, null, 2), { type: fakeTypeEl.value });
    }
  });
}

// ============================================
// GERADOR DE QR CODE
// ============================================

const qrcodeInputEl = document.getElementById("qrcodeInput");
const qrcodeInputStatsEl = document.getElementById("qrcodeInputStats");
const qrcodeGenerateBtn = document.getElementById("qrcodeGenerateBtn");
const qrcodeResetBtn = document.getElementById("qrcodeResetBtn");
const qrcodeDisplayEl = document.getElementById("qrcodeDisplay");
const qrcodeCanvasEl = document.getElementById("qrcodeCanvas");
const qrcodeDownloadBtn = document.getElementById("qrcodeDownloadBtn");
const qrcodeColorDarkEl = document.getElementById("qrcodeColorDark");
const qrcodeColorLightEl = document.getElementById("qrcodeColorLight");

// Verificar se os elementos existem
if (qrcodeInputEl && qrcodeInputStatsEl && qrcodeGenerateBtn && qrcodeResetBtn && 
    qrcodeDisplayEl && qrcodeCanvasEl && qrcodeDownloadBtn) {

let qrcodeInstance = null;

// Atualizar estatísticas do input
const updateQrcodeStats = () => {
  const text = qrcodeInputEl.value;
  const chars = text.length;
  qrcodeInputStatsEl.textContent = `${chars} caracteres`;
};

qrcodeInputEl.addEventListener("input", updateQrcodeStats);
updateQrcodeStats();

// Gerar QR Code
const generateQRCode = () => {
  const text = qrcodeInputEl.value.trim();
  
  if (!text) {
    showToast("Digite um texto ou URL para gerar o QR Code", "info");
    return;
  }

  // Verificar se a biblioteca QRCode está disponível
  if (typeof QRCode === "undefined") {
    showToast("Biblioteca QRCode não carregada. Aguarde um momento e tente novamente.", "error");
    return;
  }

  try {
    // Limpar canvas anterior
    qrcodeCanvasEl.innerHTML = "";
    
    // Obter cores dos inputs
    const colorDark = qrcodeColorDarkEl ? qrcodeColorDarkEl.value : "#5d5fef";
    const colorLight = qrcodeColorLightEl ? qrcodeColorLightEl.value : "#ffffff";
    
    // Criar nova instância do QR Code
    qrcodeInstance = new QRCode(qrcodeCanvasEl, {
      text: text,
      width: 256,
      height: 256,
      colorDark: colorDark,
      colorLight: colorLight,
      correctLevel: QRCode.CorrectLevel.H
    });

    // Exibir área do QR Code
    qrcodeDisplayEl.style.display = "block";
    saveToHistory("qrcode", text, "[QR Code image]", { colorDark: colorDark, colorLight: colorLight });
    showToast("QR Code gerado com sucesso!", "success");
  } catch (e) {
    console.error("Erro ao gerar QR Code:", e);
    showToast("Erro ao gerar QR Code. Verifique o texto inserido.", "error");
  }
};

// Baixar QR Code como PNG
const downloadQRCode = () => {
  if (!qrcodeInstance) {
    showToast("Gere um QR Code primeiro", "info");
    return;
  }

  try {
    const canvas = qrcodeCanvasEl.querySelector("canvas");
    if (!canvas) {
      showToast("Erro ao obter imagem do QR Code", "error");
      return;
    }

    // Criar link de download
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `qrcode-${Date.now()}.png`;
    link.href = url;
    link.click();
    
    showToast("QR Code baixado com sucesso!", "success");
  } catch (e) {
    console.error("Erro ao baixar QR Code:", e);
    showToast("Erro ao baixar QR Code", "error");
  }
};

// Resetar campos
const resetQRCode = () => {
  qrcodeInputEl.value = "";
  qrcodeCanvasEl.innerHTML = "";
  qrcodeDisplayEl.style.display = "none";
  qrcodeInstance = null;
  if (qrcodeColorDarkEl) qrcodeColorDarkEl.value = "#5d5fef";
  if (qrcodeColorLightEl) qrcodeColorLightEl.value = "#ffffff";
  updateQrcodeStats();
  qrcodeInputEl.focus();
};

// Event listeners
qrcodeGenerateBtn.addEventListener("click", generateQRCode);
qrcodeResetBtn.addEventListener("click", resetQRCode);
qrcodeDownloadBtn.addEventListener("click", downloadQRCode);

const qrcodeFavoriteBtn = document.getElementById("qrcodeFavoriteBtn");
if (qrcodeFavoriteBtn) {
  qrcodeFavoriteBtn.addEventListener("click", () => {
    const text = qrcodeInputEl && qrcodeInputEl.value.trim();
    if (!text) {
      showToast("Gere um QR Code primeiro", "info");
      return;
    }
    if (typeof window.openFavoriteFromCurrent === "function") {
      const colorDark = qrcodeColorDarkEl ? qrcodeColorDarkEl.value : "#5d5fef";
      const colorLight = qrcodeColorLightEl ? qrcodeColorLightEl.value : "#ffffff";
      window.openFavoriteFromCurrent("qrcode", text, "[QR Code image]", { colorDark, colorLight });
    }
  });
}

// Gerar QR Code ao pressionar Enter (Ctrl/Cmd + Enter)
qrcodeInputEl.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    generateQRCode();
  }
});

} // Fechar verificação de elementos

// ============================================
// GERADOR DE UUID
// ============================================

const uuidOutputEl = document.getElementById("uuidOutput");
const uuidOutputStatsEl = document.getElementById("uuidOutputStats");
const uuidGenerateBtn = document.getElementById("uuidGenerateBtn");
const uuidCopyBtn = document.getElementById("uuidCopyBtn");
const uuidVersionEl = document.getElementById("uuidVersion");
const uuidWithHyphensEl = document.getElementById("uuidWithHyphens");
const uuidUppercaseEl = document.getElementById("uuidUppercase");

// Verificar se os elementos existem
if (uuidOutputEl && uuidGenerateBtn && uuidCopyBtn) {

const getCrypto = () => {
  try {
    const c = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
    return c && typeof c.getRandomValues === "function" ? c : null;
  } catch {
    return null;
  }
};

const bytesToUUID = (bytes) => {
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const getRandomBytes = (len) => {
  const out = new Uint8Array(len);
  const c = getCrypto();
  if (c) {
    c.getRandomValues(out);
    return out;
  }
  // Último fallback (menos seguro) para ambientes sem Web Crypto
  for (let i = 0; i < len; i++) out[i] = Math.floor(Math.random() * 256);
  return out;
};

// UUID v4 (RFC 4122) - preferir Web Crypto (mobile-safe)
const generateUUIDv4 = () => {
  const bytes = getRandomBytes(16);
  // version 4
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  // variant RFC 4122
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return bytesToUUID(bytes);
};

// Função para gerar UUID v1 (baseado em timestamp)
const generateUUIDv1 = () => {
  // 100ns desde 1582-10-15 (UUID epoch). Usar BigInt para evitar overflow.
  const uuidEpochOffset = 0x01b21dd213814000n;
  const time100ns = BigInt(Date.now()) * 10000n + uuidEpochOffset;

  const timeLow = Number(time100ns & 0xffffffffn);
  const timeMid = Number((time100ns >> 32n) & 0xffffn);
  const timeHi = Number((time100ns >> 48n) & 0x0fffn);

  // Clock sequence 14 bits aleatórios
  const clock = getRandomBytes(2);
  const clockSeq = ((clock[0] << 8) | clock[1]) & 0x3fff;
  const clockSeqHi = ((clockSeq >> 8) & 0x3f) | 0x80; // variant RFC 4122
  const clockSeqLow = clockSeq & 0xff;

  const node = getRandomBytes(6);

  const bytes = new Uint8Array(16);
  // time_low (32)
  bytes[0] = (timeLow >>> 24) & 0xff;
  bytes[1] = (timeLow >>> 16) & 0xff;
  bytes[2] = (timeLow >>> 8) & 0xff;
  bytes[3] = timeLow & 0xff;
  // time_mid (16)
  bytes[4] = (timeMid >>> 8) & 0xff;
  bytes[5] = timeMid & 0xff;
  // time_hi_and_version (16) => version 1
  bytes[6] = ((timeHi >>> 8) & 0x0f) | 0x10;
  bytes[7] = timeHi & 0xff;
  // clock_seq
  bytes[8] = clockSeqHi;
  bytes[9] = clockSeqLow;
  // node (48)
  bytes.set(node, 10);

  return bytesToUUID(bytes);
};

// Função para gerar UUID v7 (timestamp ordenável)
const generateUUIDv7 = () => {
  // Layout v7: 48 bits timestamp (ms) + 74 bits aleatórios com version/variant
  const bytes = getRandomBytes(16);

  let ts = BigInt(Date.now());
  for (let i = 5; i >= 0; i--) {
    bytes[i] = Number(ts & 0xffn);
    ts >>= 8n;
  }

  // version 7
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  // variant RFC 4122
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  return bytesToUUID(bytes);
};

// Formatar UUID (aplicar hífens e case)
const formatUUID = (uuid, withHyphens, uppercase) => {
  // Primeiro, remover hífens para normalizar
  let formatted = uuid.replace(/-/g, "");
  
  // Aplicar hífens se necessário
  if (withHyphens && formatted.length === 32) {
    formatted = `${formatted.substring(0, 8)}-${formatted.substring(8, 12)}-${formatted.substring(12, 16)}-${formatted.substring(16, 20)}-${formatted.substring(20)}`;
  }
  
  // Aplicar case
  if (uppercase) {
    formatted = formatted.toUpperCase();
  } else {
    formatted = formatted.toLowerCase();
  }
  
  return formatted;
};

// Gerar UUID baseado na versão selecionada
const generateUUID = () => {
  const version = uuidVersionEl.value;
  let uuid;
  
  switch (version) {
    case "v1":
      uuid = generateUUIDv1();
      break;
    case "v4":
      uuid = generateUUIDv4();
      break;
    case "v7":
      uuid = generateUUIDv7();
      break;
    default:
      uuid = generateUUIDv4();
  }
  
  const withHyphens = uuidWithHyphensEl.checked;
  const uppercase = uuidUppercaseEl.checked;
  
  return formatUUID(uuid, withHyphens, uppercase);
};

// Atualizar estatísticas
const updateUUIDStats = () => {
  const uuid = uuidOutputEl.value;
  const chars = uuid.length;
  uuidOutputStatsEl.textContent = `${chars} caracteres`;
};

// Gerar e exibir UUID
const generateAndDisplayUUID = (saveIntoHistory = false) => {
  const uuid = generateUUID();
  uuidOutputEl.value = uuid;
  updateUUIDStats();
  if (saveIntoHistory) {
    const config = {
      version: uuidVersionEl.value,
      withHyphens: uuidWithHyphensEl.checked,
      uppercase: uuidUppercaseEl.checked,
    };
    saveToHistory("uuid", "", uuid, config);
  }
};

// Copiar UUID único
uuidCopyBtn.addEventListener("click", async () => {
  const uuid = uuidOutputEl.value;
  if (!uuid) {
    showToast("Gere um UUID primeiro", "info");
    return;
  }
  try {
    const ok = await copyTextToClipboard(uuid);
    if (!ok) throw new Error("Clipboard not available");
    showToast("UUID copiado com sucesso!", "success");
  } catch (e) {
    console.error("Erro ao copiar:", e);
    showToast("Erro ao copiar", "error");
  }
});

// Gerar UUID
uuidGenerateBtn.addEventListener("click", () => generateAndDisplayUUID(true));

const uuidFavoriteBtn = document.getElementById("uuidFavoriteBtn");
if (uuidFavoriteBtn) {
  uuidFavoriteBtn.addEventListener("click", () => {
    const uuid = uuidOutputEl && uuidOutputEl.value;
    if (!uuid) {
      showToast("Gere um UUID primeiro", "info");
      return;
    }
    if (typeof window.openFavoriteFromCurrent === "function") {
      window.openFavoriteFromCurrent("uuid", "", uuid, {
        version: uuidVersionEl.value,
        withHyphens: uuidWithHyphensEl.checked,
        uppercase: uuidUppercaseEl.checked,
      });
    }
  });
}

// Aplicar formatação quando opções mudarem
uuidWithHyphensEl.addEventListener("change", () => {
  if (uuidOutputEl.value) {
    const current = uuidOutputEl.value.replace(/-/g, "");
    const withHyphens = uuidWithHyphensEl.checked;
    const uppercase = uuidUppercaseEl.checked;
    uuidOutputEl.value = formatUUID(current, withHyphens, uppercase);
    updateUUIDStats();
  }
});

uuidUppercaseEl.addEventListener("change", () => {
  if (uuidOutputEl.value) {
    const uppercase = uuidUppercaseEl.checked;
    uuidOutputEl.value = uppercase ? uuidOutputEl.value.toUpperCase() : uuidOutputEl.value.toLowerCase();
  }
});

// Quando versão mudar, regenerar
uuidVersionEl.addEventListener("change", () => {
  generateAndDisplayUUID();
});

// Gerar UUID inicial ao carregar (sem salvar no histórico)
generateAndDisplayUUID(false);

} // Fechar verificação de elementos

// ============================================
// UI DO HISTÓRICO (Modal + Abas Recentes / Favoritos)
// ============================================

(function initHistoryUI() {
  if (typeof HistoryManager === "undefined") return;

  const historyModal = document.getElementById("historyModal");
  const historyModalBackdrop = document.getElementById("historyModalBackdrop");
  const historyModalClose = document.getElementById("historyModalClose");
  const historyToggle = document.getElementById("historyToggle");
  const historyClearBtn = document.getElementById("historyClearBtn");
  const historyListRecent = document.getElementById("historyListRecent");
  const historyListFavorites = document.getElementById("historyListFavorites");
  const historyEmptyRecent = document.getElementById("historyEmptyRecent");
  const historyEmptyFavorites = document.getElementById("historyEmptyFavorites");
  const favoriteNameModal = document.getElementById("favoriteNameModal");
  const favoriteNameModalBackdrop = document.getElementById("favoriteNameModalBackdrop");
  const favoriteNameModalClose = document.getElementById("favoriteNameModalClose");
  const favoriteNameInput = document.getElementById("favoriteNameInput");
  const favoriteNameConfirm = document.getElementById("favoriteNameConfirm");
  const favoriteNameCancel = document.getElementById("favoriteNameCancel");

  let lastFocusedBeforeModal = null;

  const getFocusable = (root) => {
    if (!root) return [];
    return Array.from(
      root.querySelectorAll(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
  };

  const focusFirstInModal = (modalEl) => {
    if (!modalEl) return;
    const focusables = getFocusable(modalEl);
    const first = focusables.find((el) => modalEl.contains(el)) || modalEl.querySelector(".history-modal__box");
    if (first && typeof first.focus === "function") {
      setTimeout(() => first.focus(), 0);
    }
  };

  const trapFocus = (modalEl, e) => {
    if (!modalEl || modalEl.getAttribute("data-open") !== "true") return;
    if (e.key !== "Tab") return;
    const focusables = getFocusable(modalEl).filter((el) => modalEl.contains(el));
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (e.shiftKey) {
      if (active === first || !modalEl.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const closeOnEscape = (modalEl, closeFn) => (e) => {
    if (e.key !== "Escape") return;
    if (!modalEl || modalEl.getAttribute("data-open") !== "true") return;
    e.preventDefault();
    closeFn();
  };

  const TAB_TO_TOOL = {
    sql: "formatador-sql",
    xml: "formatador-xml",
    json: "formatador-json",
    password: "gerador-senhas",
    fake: "dados-fake",
    qrcode: "gerador-qrcode",
    uuid: "gerador-uuid",
  };

  const TOOL_TO_TAB = Object.fromEntries(Object.entries(TAB_TO_TOOL).map(([k, v]) => [v, k]));

  function openHistoryModal() {
    if (historyModal) {
      lastFocusedBeforeModal = document.activeElement;
      historyModal.setAttribute("data-open", "true");
      historyModal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      renderHistoryLists();
      focusFirstInModal(historyModal);
    }
  }

  function closeHistoryModal() {
    if (historyModal) {
      historyModal.setAttribute("data-open", "false");
      historyModal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      if (lastFocusedBeforeModal && typeof lastFocusedBeforeModal.focus === "function") {
        setTimeout(() => lastFocusedBeforeModal.focus(), 0);
      }
    }
  }

  function openFavoriteNameModal(historyId, callback) {
    if (!favoriteNameModal || !favoriteNameInput) return;
    lastFocusedBeforeModal = document.activeElement;
    favoriteNameModal._pendingHistoryId = historyId;
    favoriteNameModal._pendingCallback = callback;
    favoriteNameModal._pendingFromCurrent = null;
    favoriteNameInput.value = "";
    favoriteNameModal.setAttribute("data-open", "true");
    favoriteNameModal.setAttribute("aria-hidden", "false");
    setTimeout(() => favoriteNameInput.focus(), 100);
  }

  function closeFavoriteNameModal() {
    if (favoriteNameModal) {
      favoriteNameModal.setAttribute("data-open", "false");
      favoriteNameModal.setAttribute("aria-hidden", "true");
      favoriteNameModal._pendingHistoryId = null;
      favoriteNameModal._pendingCallback = null;
      favoriteNameModal._pendingFromCurrent = null;
      if (lastFocusedBeforeModal && typeof lastFocusedBeforeModal.focus === "function") {
        setTimeout(() => lastFocusedBeforeModal.focus(), 0);
      }
    }
  }

  function renderHistoryLists() {
    const recent = HistoryManager.getHistory();
    const favorites = HistoryManager.getFavorites();

    if (historyListRecent) {
      historyListRecent.innerHTML = "";
      recent.forEach((item) => historyListRecent.appendChild(createHistoryCard(item, false)));
    }
    if (historyEmptyRecent) historyEmptyRecent.style.display = recent.length ? "none" : "block";

    if (historyListFavorites) {
      historyListFavorites.innerHTML = "";
      favorites.forEach((item) => historyListFavorites.appendChild(createHistoryCard(item, true)));
    }
    if (historyEmptyFavorites) historyEmptyFavorites.style.display = favorites.length ? "none" : "block";
  }

  function createHistoryCard(item, isFavorite) {
    const id = isFavorite ? item.favoriteId || item.id : item.id;
    const label = isFavorite && item.name ? item.name : (HistoryManager.TOOL_LABELS[item.tool] || item.tool);
    const icon = HistoryManager.TOOL_ICONS[item.tool] || "📌";
    const time = HistoryManager.formatTimestamp(item.timestamp || item.id);
    const preview = HistoryManager.getPreview(item.output);

    const card = document.createElement("div");
    card.className = "history-card";
    card.dataset.id = id;
    card.dataset.favorite = isFavorite ? "true" : "false";
    card.dataset.tool = item.tool;
    card.innerHTML = `
      <div class="history-card__head">
        <span class="history-card__icon">${icon}</span>
        <span class="history-card__label">${escapeHtml(label)}</span>
        <span class="history-card__time">${escapeHtml(time)}</span>
      </div>
      <div class="history-card__preview">${escapeHtml(preview)}</div>
      <div class="history-card__actions">
        <button type="button" class="history-card__btn history-card__btn--restore">Restaurar</button>
        <button type="button" class="history-card__btn history-card__btn--copy">Copiar</button>
        ${isFavorite
          ? `<button type="button" class="history-card__btn history-card__btn--delete" aria-label="Remover favorito">🗑️</button>`
          : `<button type="button" class="history-card__btn history-card__btn--favorite" aria-label="Favoritar">⭐</button>`
        }
      </div>
    `;

    card.querySelector(".history-card__btn--restore").addEventListener("click", () => restoreItem(id, isFavorite));
    card.querySelector(".history-card__btn--copy").addEventListener("click", () => copyItemOutput(id, isFavorite));
    if (isFavorite) {
      card.querySelector(".history-card__btn--delete").addEventListener("click", () => deleteFavorite(id));
    } else {
      card.querySelector(".history-card__btn--favorite").addEventListener("click", () => {
        openFavoriteNameModal(id, (name) => {
          const result = HistoryManager.addFavorite(id, name);
          if (result.ok) {
            showToast("Adicionado aos favoritos!", "success");
            renderHistoryLists();
          } else {
            showToast(result.error || "Erro ao favoritar", "error");
          }
        });
      });
    }
    return card;
  }

  function escapeHtml(s) {
    if (s == null) return "";
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function restoreItem(id, fromFavorites) {
    const data = HistoryManager.restoreItem(id);
    if (!data) return;
    const tab = TOOL_TO_TAB[data.tool];
    if (!tab) return;
    switchTab(tab);
    closeHistoryModal();

    const inputEl = getToolInputEl(data.tool);
    const outputEl = getToolOutputEl(data.tool);
    if (inputEl && data.input !== undefined) inputEl.value = data.input;
    if (outputEl && data.output !== undefined) {
      const out = typeof data.output === "string" ? data.output : JSON.stringify(data.output);
      outputEl.value = out;
    }
    if (data.tool === "dados-fake" && data.output) {
      try {
        const parsed = typeof data.output === "string" ? JSON.parse(data.output) : data.output;
        window.fakeData = parsed;
        if (typeof renderResults === "function" && document.getElementById("fakeResults")) {
          renderResults(parsed);
        }
      } catch (e) {
        console.warn("Restore dados-fake parse error", e);
      }
    }
    applyToolConfig(data.tool, data.config || {});

    const content = document.getElementById(`${tab}-content`);
    if (content) content.scrollIntoView({ behavior: "smooth", block: "start" });
    showToast("Item restaurado", "success");
  }

  function getToolInputEl(toolId) {
    const map = {
      "formatador-sql": "sqlInput",
      "formatador-xml": "xmlInput",
      "formatador-json": "jsonInput",
      "gerador-senhas": null,
      "dados-fake": null,
      "gerador-qrcode": "qrcodeInput",
      "gerador-uuid": null,
    };
    const id = map[toolId];
    return id ? document.getElementById(id) : null;
  }

  function getToolOutputEl(toolId) {
    const map = {
      "formatador-sql": "sqlOutput",
      "formatador-xml": "xmlOutput",
      "formatador-json": "jsonOutput",
      "gerador-senhas": "passwordOutput",
      "dados-fake": null,
      "gerador-qrcode": null,
      "gerador-uuid": "uuidOutput",
    };
    const id = map[toolId];
    return id ? document.getElementById(id) : null;
  }

  function applyToolConfig(toolId, config) {
    if (toolId === "formatador-sql") {
      if (config.formatStyle && document.getElementById("formatStyle")) document.getElementById("formatStyle").value = config.formatStyle;
      if (config.caseStyle && document.getElementById("caseStyle")) document.getElementById("caseStyle").value = config.caseStyle;
      if (typeof processSql === "function") setTimeout(processSql, 50);
    } else if (toolId === "formatador-xml") {
      if (config.indent && document.getElementById("xmlIndent")) document.getElementById("xmlIndent").value = config.indent;
      if (typeof processXml === "function") setTimeout(processXml, 50);
    } else if (toolId === "formatador-json") {
      if (config.format && document.getElementById("jsonFormat")) document.getElementById("jsonFormat").value = config.format;
      if (typeof processJson === "function") setTimeout(processJson, 50);
    } else if (toolId === "gerador-senhas") {
      if (config.length != null && passwordLengthEl) passwordLengthEl.value = config.length;
      if (config.uppercase != null && passwordUppercaseEl) passwordUppercaseEl.checked = config.uppercase;
      if (config.lowercase != null && passwordLowercaseEl) passwordLowercaseEl.checked = config.lowercase;
      if (config.numbers != null && passwordNumbersEl) passwordNumbersEl.checked = config.numbers;
      if (config.symbols != null && passwordSymbolsEl) passwordSymbolsEl.checked = config.symbols;
      if (passwordLengthValueEl) passwordLengthValueEl.textContent = passwordLengthEl ? passwordLengthEl.value : "";
      if (passwordOutputEl && typeof updatePasswordStrength === "function") updatePasswordStrength(passwordOutputEl.value || "");
    } else if (toolId === "dados-fake" && window.fakeData === undefined && config.type) {
      const fakeTypeEl = document.getElementById("fakeType");
      if (fakeTypeEl) fakeTypeEl.value = config.type;
    } else if (toolId === "gerador-uuid") {
      if (config.version && uuidVersionEl) uuidVersionEl.value = config.version;
      if (config.withHyphens != null && uuidWithHyphensEl) uuidWithHyphensEl.checked = config.withHyphens;
      if (config.uppercase != null && uuidUppercaseEl) uuidUppercaseEl.checked = config.uppercase;
    }
  }

  function copyItemOutput(id, isFavorite) {
    const data = HistoryManager.restoreItem(id);
    if (!data || data.output == null) return;
    const text = typeof data.output === "string" ? data.output : JSON.stringify(data.output);
    copyTextToClipboard(text).then(
      (ok) => showToast(ok ? "Copiado!" : "Erro ao copiar", ok ? "success" : "error"),
      () => showToast("Erro ao copiar", "error")
    );
  }

  function deleteFavorite(id) {
    if (HistoryManager.removeFavorite(id)) {
      showToast("Favorito removido", "info");
      renderHistoryLists();
    }
  }

  if (historyToggle) historyToggle.addEventListener("click", openHistoryModal);
  if (historyModalBackdrop) historyModalBackdrop.addEventListener("click", closeHistoryModal);
  if (historyModalClose) historyModalClose.addEventListener("click", closeHistoryModal);

  // A11Y: ESC para fechar + focus trap
  document.addEventListener("keydown", closeOnEscape(historyModal, closeHistoryModal));
  document.addEventListener("keydown", (e) => trapFocus(historyModal, e));

  if (historyClearBtn) {
    historyClearBtn.addEventListener("click", () => {
      if (!confirm("Limpar todo o histórico recente? Os favoritos não serão removidos.")) return;
      HistoryManager.clearHistory();
      showToast("Histórico limpo", "info");
      renderHistoryLists();
    });
  }

  const historyModalFooter = document.getElementById("historyModalFooter");

  document.querySelectorAll(".history-modal__tab[data-history-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.historyTab;
      document.querySelectorAll(".history-modal__tab").forEach((t) => t.classList.remove("history-modal__tab--active"));
      document.querySelectorAll(".history-modal__panel").forEach((p) => p.classList.remove("history-modal__panel--active"));
      tab.classList.add("history-modal__tab--active");
      const panel = document.getElementById("historyPanel" + (target === "favorites" ? "Favorites" : "Recent"));
      if (panel) panel.classList.add("history-modal__panel--active");
      if (historyModalFooter) {
        historyModalFooter.setAttribute("data-visible", target === "recent" ? "true" : "false");
      }
    });
  });

  if (historyModalFooter) {
    historyModalFooter.setAttribute("data-visible", "true");
  }

  if (favoriteNameCancel) favoriteNameCancel.addEventListener("click", closeFavoriteNameModal);
  if (favoriteNameModalBackdrop) favoriteNameModalBackdrop.addEventListener("click", closeFavoriteNameModal);
  if (favoriteNameModalClose) favoriteNameModalClose.addEventListener("click", closeFavoriteNameModal);

  // A11Y: ESC para fechar + focus trap
  document.addEventListener("keydown", closeOnEscape(favoriteNameModal, closeFavoriteNameModal));
  document.addEventListener("keydown", (e) => trapFocus(favoriteNameModal, e));

  function openFavoriteNameModalForCurrent(toolId, input, output, config) {
    if (!favoriteNameModal || !favoriteNameInput) return;
    const favorites = HistoryManager.getFavorites();
    if (favorites.length >= HistoryManager.MAX_FAVORITES) {
      showToast("Máximo de 10 favoritos. Remova um para adicionar.", "info");
      return;
    }
    lastFocusedBeforeModal = document.activeElement;
    favoriteNameModal._pendingFromCurrent = { toolId, input, output, config };
    favoriteNameModal._pendingCallback = null;
    favoriteNameModal._pendingHistoryId = null;
    favoriteNameInput.value = "";
    favoriteNameModal.setAttribute("data-open", "true");
    favoriteNameModal.setAttribute("aria-hidden", "false");
    setTimeout(() => favoriteNameInput.focus(), 100);
  }

  if (favoriteNameConfirm) {
    favoriteNameConfirm.addEventListener("click", () => {
      const name = favoriteNameInput && favoriteNameInput.value.trim();
      const fromCurrent = favoriteNameModal._pendingFromCurrent;
      const id = favoriteNameModal._pendingHistoryId;
      const cb = favoriteNameModal._pendingCallback;
      closeFavoriteNameModal();

      if (fromCurrent) {
        const result = HistoryManager.addFavoriteFromCurrent(
          fromCurrent.toolId,
          fromCurrent.input,
          fromCurrent.output,
          fromCurrent.config,
          name
        );
        if (result.ok) {
          showToast("Adicionado aos favoritos!", "success");
          if (typeof renderHistoryLists === "function") renderHistoryLists();
        } else {
          showToast(result.error || "Erro ao favoritar", "error");
        }
        return;
      }
      if (cb) cb(name);
    });
  }

  window.openFavoriteFromCurrent = function (toolKey, input, output, config) {
    const toolId = TOOL_KEY_TO_ID[toolKey] || toolKey;
    openFavoriteNameModalForCurrent(toolId, input, output, config || {});
  };
})();
