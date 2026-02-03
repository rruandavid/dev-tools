/**
 * historyManager.js - Sistema de Histórico Local com localStorage
 * Últimas 5 operações por ferramenta + Favoritos (máx 10)
 */

(function (global) {
  const STORAGE_KEY_HISTORY = "devtools_history";
  const STORAGE_KEY_FAVORITES = "devtools_favorites";
  const MAX_RECENT_PER_TOOL = 5;
  const MAX_FAVORITES = 10;
  const PREVIEW_LENGTH = 80;

  const TOOL_IDS = [
    "formatador-sql",
    "formatador-xml",
    "formatador-json",
    "gerador-senhas",
    "dados-fake",
    "gerador-qrcode",
    "gerador-uuid",
  ];

  const TOOL_LABELS = {
    "formatador-sql": "Formatador SQL",
    "formatador-xml": "Formatador XML",
    "formatador-json": "Formatador JSON",
    "gerador-senhas": "Gerador de Senhas",
    "dados-fake": "Dados Fake",
    "gerador-qrcode": "QR Code",
    "gerador-uuid": "Gerador UUID",
  };

  const TOOL_ICONS = {
    "formatador-sql": "⚡",
    "formatador-xml": "📄",
    "formatador-json": "🔷",
    "gerador-senhas": "🔒",
    "dados-fake": "👤",
    "gerador-qrcode": "📱",
    "gerador-uuid": "🔑",
  };

  function safeGet(key, defaultValue) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : (defaultValue ?? []);
    } catch (e) {
      console.warn("historyManager: erro ao ler localStorage", e);
      return defaultValue ?? [];
    }
  }

  function safeSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      if (e.name === "QuotaExceededError" || e.code === 22) {
        console.warn("historyManager: quota excedida, limpando histórico antigo");
        try {
          localStorage.removeItem(key);
          localStorage.setItem(key, JSON.stringify(value));
          return true;
        } catch (e2) {
          console.error("historyManager: falha ao salvar após limpeza", e2);
          return false;
        }
      }
      console.error("historyManager: erro ao salvar", e);
      return false;
    }
  }

  function createEntry(tool, input, output, config) {
    const id = Date.now();
    return {
      id,
      tool,
      input: typeof input === "string" ? input : JSON.stringify(input ?? ""),
      output: typeof output === "string" ? output : JSON.stringify(output ?? ""),
      config: config || {},
      timestamp: id,
    };
  }

  function saveToHistory(tool, input, output, config) {
    if (!TOOL_IDS.includes(tool)) return null;
    const history = safeGet(STORAGE_KEY_HISTORY, []);
    const entry = createEntry(tool, input, output, config);
    const byTool = history.filter((e) => e.tool === tool);
    const rest = history.filter((e) => e.tool !== tool);
    byTool.unshift(entry);
    const trimmed = byTool.slice(0, MAX_RECENT_PER_TOOL);
    const merged = [...trimmed, ...rest].sort((a, b) => (b.timestamp || b.id) - (a.timestamp || a.id));
    return safeSet(STORAGE_KEY_HISTORY, merged) ? entry : null;
  }

  function getHistory(tool) {
    const history = safeGet(STORAGE_KEY_HISTORY, []);
    if (tool) return history.filter((e) => e.tool === tool);
    return history;
  }

  function getFavorites() {
    return safeGet(STORAGE_KEY_FAVORITES, []);
  }

  function addFavorite(historyId, name) {
    const history = safeGet(STORAGE_KEY_HISTORY, []);
    const favorites = safeGet(STORAGE_KEY_FAVORITES, []);
    if (favorites.length >= MAX_FAVORITES) return { ok: false, error: "Máximo de 10 favoritos." };
    const item = history.find((e) => String(e.id) === String(historyId));
    if (!item) return { ok: false, error: "Item não encontrado no histórico." };
    const fav = {
      ...item,
      name: (name || "").trim() || `Favorito ${favorites.length + 1}`,
      isFavorite: true,
      favoriteId: Date.now(),
    };
    favorites.unshift(fav);
    safeSet(STORAGE_KEY_FAVORITES, favorites);
    return { ok: true, item: fav };
  }

  function addFavoriteFromCurrent(tool, input, output, config, name) {
    const favorites = safeGet(STORAGE_KEY_FAVORITES, []);
    if (favorites.length >= MAX_FAVORITES) return { ok: false, error: "Máximo de 10 favoritos." };
    if (!TOOL_IDS.includes(tool)) return { ok: false, error: "Ferramenta inválida." };
    const entry = createEntry(tool, input, output, config);
    const fav = {
      ...entry,
      name: (name || "").trim() || `Favorito ${favorites.length + 1}`,
      isFavorite: true,
      favoriteId: entry.id,
    };
    favorites.unshift(fav);
    safeSet(STORAGE_KEY_FAVORITES, favorites);
    return { ok: true, item: fav };
  }

  function removeFavorite(id) {
    const favorites = safeGet(STORAGE_KEY_FAVORITES, []);
    const filtered = favorites.filter((e) => String(e.favoriteId || e.id) !== String(id));
    if (filtered.length === favorites.length) return false;
    safeSet(STORAGE_KEY_FAVORITES, filtered);
    return true;
  }

  function clearHistory() {
    safeSet(STORAGE_KEY_HISTORY, []);
    return true;
  }

  function restoreItem(id) {
    const history = safeGet(STORAGE_KEY_HISTORY, []);
    const favorites = safeGet(STORAGE_KEY_FAVORITES, []);
    const fromHistory = history.find((e) => String(e.id) === String(id));
    if (fromHistory) return { ...fromHistory, fromFavorites: false };
    const fromFav = favorites.find((e) => String(e.favoriteId || e.id) === String(id));
    if (fromFav) return { ...fromFav, fromFavorites: true };
    return null;
  }

  function getPreview(output) {
    if (output == null) return "";
    const str = typeof output === "string" ? output : JSON.stringify(output);
    const oneLine = str.replace(/\s+/g, " ").trim();
    return oneLine.length > PREVIEW_LENGTH ? oneLine.slice(0, PREVIEW_LENGTH) + "…" : oneLine;
  }

  function formatTimestamp(ts) {
    const t = typeof ts === "number" ? ts : parseInt(ts, 10);
    if (!t || isNaN(t)) return "";
    const d = new Date(t);
    const now = Date.now();
    const diff = now - d;
    if (diff < 60000) return "Agora";
    if (diff < 3600000) return `Há ${Math.floor(diff / 60000)}min`;
    if (diff < 86400000) return `Há ${Math.floor(diff / 3600000)}h`;
    if (diff < 172800000) return "Ontem";
    if (diff < 604800000) return `Há ${Math.floor(diff / 86400000)} dias`;
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  global.HistoryManager = {
    saveToHistory,
    getHistory,
    getFavorites,
    addFavorite,
    addFavoriteFromCurrent,
    removeFavorite,
    clearHistory,
    restoreItem,
    getPreview,
    formatTimestamp,
    TOOL_LABELS,
    TOOL_ICONS,
    TOOL_IDS,
    MAX_FAVORITES,
    PREVIEW_LENGTH,
  };
})(typeof window !== "undefined" ? window : this);
