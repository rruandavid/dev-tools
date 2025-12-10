// ============================================
// SISTEMA DE ABAS
// ============================================

const tabs = document.querySelectorAll(".tab");
const tabContents = document.querySelectorAll(".tab-content");

const switchTab = (targetTab) => {
  tabs.forEach((tab) => {
    const isSelected = tab.dataset.tab === targetTab;
    tab.setAttribute("aria-selected", isSelected);
  });

  tabContents.forEach((content) => {
    const isActive = content.id === `${targetTab}-content`;
    content.setAttribute("data-active", isActive);
  });

  // Salvar aba ativa no localStorage
  localStorage.setItem("activeTab", targetTab);
};

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    switchTab(tab.dataset.tab);
  });
});

// Restaurar aba ativa ao carregar
const savedTab = localStorage.getItem("activeTab") || "sql";
switchTab(savedTab);

// Permitir scroll horizontal com roda do mouse nas tabs
const tabsContainer = document.querySelector(".tabs");
if (tabsContainer) {
  tabsContainer.addEventListener("wheel", (e) => {
    // Verificar se há scroll horizontal disponível
    const hasHorizontalScroll = tabsContainer.scrollWidth > tabsContainer.clientWidth;
    
    if (hasHorizontalScroll) {
      // Prevenir scroll vertical padrão
      e.preventDefault();
      // Aplicar scroll horizontal
      tabsContainer.scrollLeft += e.deltaY;
    }
  }, { passive: false });
}

// Atualizar contador de ferramentas dinamicamente
const updateToolsCount = () => {
  const toolCount = tabs.length;
  const toolsCountEl = document.getElementById("toolsCount");
  if (toolsCountEl) {
    toolsCountEl.textContent = toolCount;
  }
};

updateToolsCount();

// ============================================
// SISTEMA DE TOAST
// ============================================

const toastContainer = document.getElementById("toastContainer");

const showToast = (message, type = "info") => {
  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;

  const icons = {
    success: "✓",
    error: "✕",
    info: "ℹ",
  };

  toast.innerHTML = `
    <span class="toast__icon">${icons[type] || icons.info}</span>
    <span class="toast__message">${message}</span>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
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
  saveToHistory("sql", raw, sqlOutputEl.value);
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
    await navigator.clipboard.writeText(sqlOutputEl.value);
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
    saveToHistory("xml", raw, formatted);
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
    await navigator.clipboard.writeText(xmlOutputEl.value);
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
    saveToHistory("json", raw, result);
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
    await navigator.clipboard.writeText(jsonOutputEl.value);
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

// ============================================
// HISTÓRICO LOCAL (localStorage)
// ============================================

const HISTORY_KEY = "formatter_history";
const MAX_HISTORY_ITEMS = 50;

const saveToHistory = (type, input, output) => {
  try {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    const newEntry = {
      type,
      input,
      output,
      timestamp: Date.now(),
    };

    history.unshift(newEntry);
    if (history.length > MAX_HISTORY_ITEMS) {
      history.pop();
    }

    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.error("Erro ao salvar histórico:", e);
  }
};

// Função para limpar histórico (pode ser chamada externamente se necessário)
window.clearFormatterHistory = () => {
  localStorage.removeItem(HISTORY_KEY);
  showToast("Histórico limpo", "info");
};

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

passwordGenerateBtn.addEventListener("click", updatePassword);

passwordCopyBtn.addEventListener("click", async () => {
  const password = passwordOutputEl.value;
  if (!password) {
    showToast("Gere uma senha primeiro", "info");
    return;
  }
  try {
    await navigator.clipboard.writeText(password);
    showToast("Senha copiada com sucesso!", "success");
  } catch (e) {
    console.error("Não foi possível copiar:", e);
    showToast("Erro ao copiar", "error");
  }
});

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

// Estrutura de dados coerente: Estados, Cidades e faixas de CEP
const STATE_CITIES_DATA = {
  "AC": {
    cities: ["Rio Branco", "Cruzeiro do Sul", "Sena Madureira", "Tarauacá", "Feijó"],
    cepRange: { min: 69900, max: 69999 }
  },
  "AL": {
    cities: ["Maceió", "Arapiraca", "Palmeira dos Índios", "Rio Largo", "Penedo"],
    cepRange: { min: 57000, max: 57999 }
  },
  "AP": {
    cities: ["Macapá", "Santana", "Laranjal do Jari", "Oiapoque", "Mazagão"],
    cepRange: { min: 68900, max: 68999 }
  },
  "AM": {
    cities: ["Manaus", "Parintins", "Itacoatiara", "Manacapuru", "Coari"],
    cepRange: { min: 69000, max: 69299 }
  },
  "BA": {
    cities: ["Salvador", "Feira de Santana", "Vitória da Conquista", "Camaçari", "Juazeiro"],
    cepRange: { min: 40000, max: 48999 }
  },
  "CE": {
    cities: ["Fortaleza", "Caucaia", "Juazeiro do Norte", "Maracanaú", "Sobral"],
    cepRange: { min: 60000, max: 63999 }
  },
  "DF": {
    cities: ["Brasília", "Taguatinga", "Ceilândia", "Sobradinho", "Planaltina"],
    cepRange: { min: 70000, max: 73699 }
  },
  "ES": {
    cities: ["Vitória", "Vila Velha", "Cariacica", "Serra", "Cachoeiro de Itapemirim"],
    cepRange: { min: 29000, max: 29999 }
  },
  "GO": {
    cities: ["Goiânia", "Aparecida de Goiânia", "Anápolis", "Rio Verde", "Luziânia"],
    cepRange: { min: 74000, max: 76999 }
  },
  "MA": {
    cities: ["São Luís", "Imperatriz", "Caxias", "Timon", "Codó"],
    cepRange: { min: 65000, max: 65999 }
  },
  "MT": {
    cities: ["Cuiabá", "Várzea Grande", "Rondonópolis", "Sinop", "Tangará da Serra"],
    cepRange: { min: 78000, max: 78899 }
  },
  "MS": {
    cities: ["Campo Grande", "Dourados", "Três Lagoas", "Corumbá", "Ponta Porã"],
    cepRange: { min: 79000, max: 79999 }
  },
  "MG": {
    cities: ["Belo Horizonte", "Uberlândia", "Contagem", "Juiz de Fora", "Betim"],
    cepRange: { min: 30000, max: 39999 }
  },
  "PA": {
    cities: ["Belém", "Ananindeua", "Marituba", "Paragominas", "Castanhal"],
    cepRange: { min: 66000, max: 68899 }
  },
  "PB": {
    cities: ["João Pessoa", "Campina Grande", "Santa Rita", "Patos", "Bayeux"],
    cepRange: { min: 58000, max: 58999 }
  },
  "PR": {
    cities: ["Curitiba", "Londrina", "Maringá", "Ponta Grossa", "Cascavel"],
    cepRange: { min: 80000, max: 87999 }
  },
  "PE": {
    cities: ["Recife", "Jaboatão dos Guararapes", "Olinda", "Caruaru", "Petrolina"],
    cepRange: { min: 50000, max: 56999 }
  },
  "PI": {
    cities: ["Teresina", "Parnaíba", "Picos", "Piripiri", "Floriano"],
    cepRange: { min: 64000, max: 64999 }
  },
  "RJ": {
    cities: ["Rio de Janeiro", "São Gonçalo", "Duque de Caxias", "Nova Iguaçu", "Niterói"],
    cepRange: { min: 20000, max: 28999 }
  },
  "RN": {
    cities: ["Natal", "Mossoró", "Parnamirim", "São Gonçalo do Amarante", "Macaíba"],
    cepRange: { min: 59000, max: 59999 }
  },
  "RS": {
    cities: ["Porto Alegre", "Caxias do Sul", "Pelotas", "Canoas", "Santa Maria"],
    cepRange: { min: 90000, max: 99999 }
  },
  "RO": {
    cities: ["Porto Velho", "Ji-Paraná", "Ariquemes", "Vilhena", "Cacoal"],
    cepRange: { min: 76800, max: 76999 }
  },
  "RR": {
    cities: ["Boa Vista", "Rorainópolis", "Caracaraí", "Alto Alegre", "Bonfim"],
    cepRange: { min: 69300, max: 69399 }
  },
  "SC": {
    cities: ["Florianópolis", "Joinville", "Blumenau", "São José", "Criciúma"],
    cepRange: { min: 88000, max: 89999 }
  },
  "SP": {
    cities: ["São Paulo", "Guarulhos", "Campinas", "São Bernardo do Campo", "Santo André"],
    cepRange: { min: 10000, max: 19999 }
  },
  "SE": {
    cities: ["Aracaju", "Nossa Senhora do Socorro", "Lagarto", "Itabaiana", "São Cristóvão"],
    cepRange: { min: 49000, max: 49999 }
  },
  "TO": {
    cities: ["Palmas", "Araguaína", "Gurupi", "Porto Nacional", "Paraíso do Tocantins"],
    cepRange: { min: 77000, max: 77999 }
  }
};

// Funções auxiliares
const randomItem = (array) => array[Math.floor(Math.random() * array.length)];
const randomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Obter dados de cidade e CEP baseado no estado
const getCityAndCEP = (state) => {
  const stateData = STATE_CITIES_DATA[state];
  if (!stateData) {
    // Fallback para estado não encontrado
    return {
      city: "São Paulo",
      cepRange: { min: 10000, max: 19999 }
    };
  }
  
  const city = randomItem(stateData.cities);
  return {
    city,
    cepRange: stateData.cepRange
  };
};

// Buscar dados de endereço na API ViaCEP
const fetchAddressFromViaCEP = async (state, city = null) => {
  try {
    const stateData = STATE_CITIES_DATA[state];
    if (!stateData) {
      return null;
    }

    const targetCity = city || randomItem(stateData.cities);
    
    // Estratégia 1: Tentar buscar CEPs válidos da cidade usando busca por logradouro comum
    const commonStreets = ["Rua", "Avenida", "Praça", "R", "Av"];
    
    for (const street of commonStreets) {
      try {
        // Buscar CEPs na cidade usando a API ViaCEP
        // Formato: https://viacep.com.br/ws/{UF}/{cidade}/{logradouro}/json/
        const searchUrl = `https://viacep.com.br/ws/${state}/${encodeURIComponent(targetCity)}/${encodeURIComponent(street)}/json/`;
        
        const response = await fetch(searchUrl);
        
        if (response.ok) {
          const data = await response.json();
          
          // A API retorna um array, pegar um resultado aleatório
          if (Array.isArray(data) && data.length > 0) {
            // Filtrar apenas resultados válidos
            const validResults = data.filter(item => !item.erro && item.uf === state);
            
            if (validResults.length > 0) {
              const addressData = validResults[Math.floor(Math.random() * validResults.length)];
              
              return {
                cep: addressData.cep,
                logradouro: addressData.logradouro || `${randomItem(STREET_TYPES)} ${randomItem(STREET_NAMES)}`,
                complemento: addressData.complemento || "",
                bairro: addressData.bairro || randomItem(NEIGHBORHOODS),
                cidade: addressData.localidade || targetCity,
                estado: addressData.uf || state
              };
            }
          }
        }
      } catch (error) {
        // Continuar tentando próximo logradouro
        continue;
      }
      
      // Pequeno delay entre tentativas
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Estratégia 2: Se a busca por logradouro não funcionar, tentar buscar CEPs gerados
    return await tryFindValidCEP(state, targetCity, stateData.cepRange);
    
  } catch (error) {
    console.warn("Erro ao buscar dados na ViaCEP:", error);
    return null;
  }
};

// Tentar encontrar um CEP válido testando alguns CEPs do range
const tryFindValidCEP = async (state, city, cepRange, maxAttempts = 10) => {
  // Tentar CEPs mais comuns primeiro (centros de cidade geralmente têm CEPs menores)
  const commonSuffixes = [100, 200, 300, 400, 500, 600, 700, 800, 900, 000];
  
  for (let i = 0; i < maxAttempts; i++) {
    let cepPrefix, cepSuffix;
    
    // Nas primeiras tentativas, usar sufixos mais comuns
    if (i < commonSuffixes.length) {
      cepPrefix = randomNumber(cepRange.min, cepRange.max);
      cepSuffix = commonSuffixes[i];
    } else {
      // Depois, tentar aleatoriamente
      cepPrefix = randomNumber(cepRange.min, cepRange.max);
      cepSuffix = randomNumber(100, 999);
    }
    
    const cep = String(cepPrefix).padStart(5, "0") + String(cepSuffix).padStart(3, "0");
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (!data.erro && data.uf === state) {
          return {
            cep: data.cep,
            logradouro: data.logradouro || `${randomItem(STREET_TYPES)} ${randomItem(STREET_NAMES)}`,
            complemento: data.complemento || "",
            bairro: data.bairro || randomItem(NEIGHBORHOODS),
            cidade: data.localidade || city,
            estado: data.uf || state
          };
        }
      }
    } catch (error) {
      // Continuar tentando
      continue;
    }
    
    // Pequeno delay para não sobrecarregar a API
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  
  return null;
};

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

// Verificar se CNPJ existe na base real usando API
const checkCNPJExists = async (cnpj) => {
  try {
    // Usar API gratuita da ReceitaWS ou BrasilAPI
    const cleanCNPJ = cnpj.replace(/\D/g, "");
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
const generateCNPJ = async (withPunctuation = true, maxAttempts = 10) => {
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

// Gerar CEP baseado no range do estado
const generateCEP = (cepRange, withPunctuation = true) => {
  // Gerar CEP dentro do range válido do estado
  const cepPrefix = randomNumber(cepRange.min, cepRange.max);
  const cepSuffix = randomNumber(100, 999);
  const cep = String(cepPrefix).padStart(5, "0") + String(cepSuffix);
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
  const state = document.getElementById("personState").value || randomItem(Object.keys(STATE_CITIES_DATA));
  const withPunctuation = document.getElementById("personPunctuation").value === "true";

  const firstName = gender === "male" ? randomItem(FIRST_NAMES_MALE) : randomItem(FIRST_NAMES_FEMALE);
  const lastName = randomItem(LAST_NAMES) + " " + randomItem(LAST_NAMES);
  const fullName = `${firstName} ${lastName}`;

  // Obter cidade e CEP coerentes com o estado
  const { city, cepRange } = getCityAndCEP(state);

  // Buscar dados reais de endereço na API ViaCEP
  const addressData = await fetchAddressFromViaCEP(state, city);
  
  // Gerar CPF que não existe na base real
  const cpf = await generateCPF(withPunctuation);

  // Usar dados da API ou fallback para dados gerados
  const cep = addressData 
    ? (withPunctuation ? addressData.cep : addressData.cep.replace(/\D/g, ""))
    : generateCEP(cepRange, withPunctuation);
  
  const endereco = addressData 
    ? `${addressData.logradouro}, ${randomNumber(1, 9999)}`
    : `${randomItem(STREET_TYPES)} ${randomItem(STREET_NAMES)}, ${randomNumber(1, 9999)}`;
  
  const bairro = addressData?.bairro || randomItem(NEIGHBORHOODS);
  const cidade = addressData?.cidade || city;

  return {
    nome: fullName,
    cpf: cpf,
    rg: generateRG(withPunctuation),
    dataNascimento: generateBirthDate(age),
    sexo: gender === "male" ? "Masculino" : "Feminino",
    email: generateEmail(firstName + "." + lastName.split(" ")[0]),
    cep: cep,
    endereco: endereco,
    bairro: bairro,
    cidade: cidade,
    estado: state,
    telefone: generatePhone(withPunctuation),
    celular: generateCellphone(withPunctuation),
  };
};

// Gerar empresa
const generateCompany = async () => {
  const state = document.getElementById("companyState").value || randomItem(Object.keys(STATE_CITIES_DATA));
  const yearsAgo = parseInt(document.getElementById("companyYears").value);
  const withPunctuation = document.getElementById("companyPunctuation").value === "true";

  const activity = randomItem(COMPANY_ACTIVITIES);
  const companyName = `${randomItem(LAST_NAMES)} ${activity} ${randomItem(COMPANY_TYPES)}`;
  const fantasyName = `${activity} ${randomItem(["Plus", "Premium", "Express", "Solutions", "Group"])}`;

  // Obter cidade e CEP coerentes com o estado
  const { city, cepRange } = getCityAndCEP(state);

  // Buscar dados reais de endereço na API ViaCEP
  const addressData = await fetchAddressFromViaCEP(state, city);

  // Gerar CNPJ que não existe na base real
  const cnpj = await generateCNPJ(withPunctuation);

  // Usar dados da API ou fallback para dados gerados
  const cep = addressData 
    ? (withPunctuation ? addressData.cep : addressData.cep.replace(/\D/g, ""))
    : generateCEP(cepRange, withPunctuation);
  
  const endereco = addressData 
    ? addressData.logradouro
    : `${randomItem(STREET_TYPES)} ${randomItem(STREET_NAMES)}`;
  
  const numero = String(randomNumber(1, 9999));
  const bairro = addressData?.bairro || randomItem(NEIGHBORHOODS);
  const cidade = addressData?.cidade || city;

  return {
    nome: companyName,
    nomeFantasia: fantasyName,
    cnpj: cnpj,
    inscricaoEstadual: generateIE(state, withPunctuation),
    dataAbertura: generateOpeningDate(yearsAgo),
    site: `www.${fantasyName.toLowerCase().replace(/\s+/g, "")}.com.br`,
    email: `contato@${fantasyName.toLowerCase().replace(/\s+/g, "")}.com.br`,
    cep: cep,
    endereco: `${endereco}, ${numero}`,
    numero: numero,
    bairro: bairro,
    cidade: cidade,
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
    item.innerHTML = `
      <div class="fake-result-item__label">${key}</div>
      <div class="fake-result-item__value">
        <span>${value}</span>
        <button class="btn btn-sm btn-outline-secondary fake-result-item__copy" data-value="${value}">Copiar</button>
      </div>
    `;
    fakeResultsEl.appendChild(item);
  });

  // Adicionar listeners de cópia
  fakeResultsEl.querySelectorAll(".fake-result-item__copy").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const value = btn.dataset.value;
      try {
        await navigator.clipboard.writeText(value);
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
    await navigator.clipboard.writeText(JSON.stringify(window.fakeData, null, 2));
    showToast("JSON copiado com sucesso!", "success");
  } catch (e) {
    showToast("Erro ao copiar", "error");
  }
});
