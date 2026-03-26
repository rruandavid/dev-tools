// Text Formatter tool (isolated): attaches `window.TextFormatterTool`
(function (global) {
  const DEFAULT_WORDS_PER_LINE = 10;

  const hasUnicodeProps = () => {
    try {
      // eslint-disable-next-line no-new
      new RegExp("\\p{L}", "u");
      return true;
    } catch {
      return false;
    }
  };

  const UNICODE_PROPS = hasUnicodeProps();

  const segmentGraphemes = (text) => {
    try {
      if (global.Intl && typeof global.Intl.Segmenter === "function") {
        const seg = new global.Intl.Segmenter("pt-BR", { granularity: "grapheme" });
        return Array.from(seg.segment(String(text ?? "")), (s) => s.segment);
      }
    } catch {
      // fallback below
    }
    return String(text ?? "").split("");
  };

  const reverseText = (text) => segmentGraphemes(text).reverse().join("");

  const removeAccents = (text) =>
    String(text ?? "")
      .normalize("NFD")
      .replace(UNICODE_PROPS ? /\p{Diacritic}+/gu : /[\u0300-\u036f]+/g, "");

  const removePunctuation = (text) =>
    String(text ?? "").replace(UNICODE_PROPS ? /\p{P}+/gu : /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]+/g, "");

  const removeNumbers = (text) =>
    String(text ?? "").replace(UNICODE_PROPS ? /\p{Number}+/gu : /[0-9]+/g, "");

  const onlyLetters = (text) =>
    String(text ?? "").replace(UNICODE_PROPS ? /[^\p{L}\s]+/gu : /[^A-Za-zÀ-ÿ\s]+/g, "");

  const onlyNumbers = (text) =>
    String(text ?? "").replace(UNICODE_PROPS ? /[^\p{Number}]+/gu : /\D+/g, "");

  const collapseSpaces = (text) =>
    String(text ?? "")
      .replace(/[ \t]+/g, " ")
      .replace(/ *\n */g, "\n")
      .trim();

  const capitalizeWords = (text) =>
    String(text ?? "")
      .toLocaleLowerCase("pt-BR")
      .replace(UNICODE_PROPS ? /\p{L}[\p{L}'’\-]*/gu : /[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’\-]*/g, (w) => {
        const first = w.slice(0, 1).toLocaleUpperCase("pt-BR");
        return first + w.slice(1);
      });

  const alternatingCase = (text) => {
    const chars = segmentGraphemes(text);
    let upper = false;
    return chars
      .map((ch) => {
        const s = String(ch);
        const isLetter = UNICODE_PROPS ? /\p{L}/u.test(s) : /[A-Za-zÀ-ÿ]/.test(s);
        if (!isLetter) return s;
        upper = !upper;
        return upper ? s.toLocaleUpperCase("pt-BR") : s.toLocaleLowerCase("pt-BR");
      })
      .join("");
  };

  const reverseEachWordKeepOrder = (text) => {
    const str = String(text ?? "");
    // Preserva whitespace (não normaliza)
    return str.replace(UNICODE_PROPS ? /\p{L}[\p{L}\p{Number}'’\-]*/gu : /[A-Za-zÀ-ÿ0-9'’\-]+/g, (w) =>
      reverseText(w)
    );
  };

  const reverseWordOrder = (text) => {
    const words = String(text ?? "").trim().split(/\s+/).filter(Boolean);
    return words.reverse().join(" ");
  };

  const addLineBreaksAfterSentences = (text) =>
    String(text ?? "").replace(/([.?!])\s+/g, "$1\n");

  const removeLineBreaks = (text) =>
    String(text ?? "")
      .replace(/\r\n/g, "\n")
      .replace(/\n+/g, " ");

  const breakEveryXWords = (text, x) => {
    const words = String(text ?? "").trim().split(/\s+/).filter(Boolean);
    if (!words.length) return "";
    const out = [];
    for (let i = 0; i < words.length; i++) {
      out.push(words[i]);
      const isEndOfLine = (i + 1) % x === 0 && i !== words.length - 1;
      out.push(isEndOfLine ? "\n" : " ");
    }
    return out.join("").trim();
  };

  const compactText = (text) => {
    const noPunct = removePunctuation(text);
    return String(noPunct).replace(/\s+/g, "");
  };

  const removeDuplicateWordsConsecutive = (text) => {
    const tokens = String(text ?? "").split(/(\s+)/); // mantém separadores
    let lastWordNorm = null;
    return tokens
      .filter((tok) => {
        if (!tok) return false;
        if (/^\s+$/.test(tok)) return true;
        const norm = removeAccents(tok).toLocaleLowerCase("pt-BR");
        const isWord = UNICODE_PROPS ? /\p{L}/u.test(tok) : /[A-Za-zÀ-ÿ]/.test(tok);
        if (!isWord) {
          lastWordNorm = null;
          return true;
        }
        if (norm && norm === lastWordNorm) return false;
        lastWordNorm = norm;
        return true;
      })
      .join("");
  };

  const slugify = (text) => {
    let s = String(text ?? "").toLocaleLowerCase("pt-BR");
    s = removeAccents(s);
    s = s.replace(UNICODE_PROPS ? /[^\p{L}\p{Number}]+/gu : /[^a-z0-9]+/g, "-");
    s = s.replace(/-+/g, "-").replace(/^-|-$/g, "");
    return s;
  };

  const enforceMutualExclusive = (state) => {
    // Case: upper/lower/capitalize/alternating são conflitantes entre si
    const caseKeys = ["optUppercase", "optLowercase", "optCapitalizeWords", "optAlternatingCase"];
    const enabled = caseKeys.filter((k) => state[k]);
    if (enabled.length <= 1) return state;
    // Mantém o último marcado (UI cuida do "último" atualizando o state), aqui só garante consistência:
    const keep = enabled[enabled.length - 1];
    caseKeys.forEach((k) => {
      if (k !== keep) state[k] = false;
    });
    return state;
  };

  const applyPipeline = (input, rawState, wordsPerLine) => {
    const state = enforceMutualExclusive({ ...rawState });
    let text = String(input ?? "");

    // 1) limpeza base
    if (state.optRemoveAccents) text = removeAccents(text);
    if (state.optRemovePunctuation) text = removePunctuation(text);
    if (state.optRemoveNumbers) text = removeNumbers(text);
    if (state.optOnlyLetters) text = onlyLetters(text);
    if (state.optOnlyNumbers) text = onlyNumbers(text);

    // 2) quebras / whitespace
    if (state.optRemoveLineBreaks) text = removeLineBreaks(text);
    if (state.optRemoveExtraSpaces) text = collapseSpaces(text);
    if (state.optCompactText) text = compactText(text);

    // 3) organização / palavras
    if (state.optReverseWordsKeepOrder) text = reverseEachWordKeepOrder(text);
    if (state.optReverseWordOrder) text = reverseWordOrder(text);
    if (state.optRemoveDuplicateWords) text = removeDuplicateWordsConsecutive(text);
    if (state.optBreakEveryXWords) {
      const x = Number.isFinite(wordsPerLine) && wordsPerLine > 0 ? wordsPerLine : DEFAULT_WORDS_PER_LINE;
      text = breakEveryXWords(text, x);
    }

    // 4) case
    if (state.optUppercase) text = text.toLocaleUpperCase("pt-BR");
    if (state.optLowercase) text = text.toLocaleLowerCase("pt-BR");
    if (state.optCapitalizeWords) text = capitalizeWords(text);
    if (state.optAlternatingCase) text = alternatingCase(text);

    // 5) transforms finais
    if (state.optReverseText) text = reverseText(text);
    if (state.optAddLineBreaks) text = addLineBreaksAfterSentences(text);
    if (state.optSlugify) text = slugify(text);

    return { text, state };
  };

  global.TextFormatterTool = {
    DEFAULT_WORDS_PER_LINE,
    applyPipeline,
    enforceMutualExclusive,
  };

  // UI wiring (optional). Exposes `window.TextFormatterUI.apply()`.
  function initTextFormatterUI() {
    const inputEl = document.getElementById("textInput");
    const outputEl = document.getElementById("textOutput");
    const copyBtn = document.getElementById("textCopyBtn");
    const resetBtn = document.getElementById("textResetBtn");
    const favoriteBtn = document.getElementById("textFavoriteBtn");
    const wordsPerLineEl = document.getElementById("textWordsPerLine");

    if (!inputEl || !outputEl) return;

    const optionIds = [
      "optUppercase",
      "optLowercase",
      "optCapitalizeWords",
      "optRemoveExtraSpaces",
      "optReverseText",
      "optAddLineBreaks",
      "optAlternatingCase",
      "optReverseWordsKeepOrder",
      "optReverseWordOrder",
      "optSlugify",
      "optRemoveAccents",
      "optRemovePunctuation",
      "optRemoveNumbers",
      "optOnlyLetters",
      "optOnlyNumbers",
      "optRemoveLineBreaks",
      "optBreakEveryXWords",
      "optCompactText",
      "optRemoveDuplicateWords",
    ];

    const getState = () =>
      optionIds.reduce((acc, id) => {
        const el = document.getElementById(id);
        acc[id] = !!(el && el.checked);
        return acc;
      }, {});

    const setState = (next) => {
      optionIds.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (typeof next[id] === "boolean") el.checked = next[id];
      });
    };

    const getWordsPerLine = () => {
      const n = parseInt(wordsPerLineEl && wordsPerLineEl.value, 10);
      if (!Number.isFinite(n) || n <= 0) return DEFAULT_WORDS_PER_LINE;
      return Math.min(Math.max(n, 1), 200);
    };

    const apply = () => {
      const { text, state } = applyPipeline(inputEl.value, getState(), getWordsPerLine());
      outputEl.value = text;
      // Mantém UI consistente quando houver conflitos (ex.: caixa alta vs baixa)
      setState(state);
      try {
        const statsEl = document.getElementById("textOutputStats");
        if (statsEl) {
          const lines = text.split("\n").length;
          const chars = text.length;
          statsEl.textContent = `${lines} linhas • ${chars} caracteres`;
        }
      } catch {
        // noop
      }
      if (typeof window !== "undefined" && typeof window.saveToHistory === "function") {
        try {
          window.saveToHistory("text", inputEl.value, text, { ...state, wordsPerLine: getWordsPerLine() });
        } catch {
          // noop
        }
      }
      return text;
    };

    // Debounce leve (evita travar em textos grandes)
    let debounceId;
    const scheduleApply = () => {
      window.clearTimeout(debounceId);
      debounceId = window.setTimeout(apply, 150);
    };

    // Eventos
    inputEl.addEventListener("input", scheduleApply);
    optionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("change", () => {
        // Ao marcar opções de case, desmarca as demais imediatamente (UX previsível)
        const isCase =
          id === "optUppercase" || id === "optLowercase" || id === "optCapitalizeWords" || id === "optAlternatingCase";
        if (isCase && el.checked) {
          const state = getState();
          const normalized = enforceMutualExclusive(state);
          setState(normalized);
        }
        apply();
      });
    });
    if (wordsPerLineEl) wordsPerLineEl.addEventListener("input", scheduleApply);

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        inputEl.value = "";
        outputEl.value = "";
        if (wordsPerLineEl) wordsPerLineEl.value = String(DEFAULT_WORDS_PER_LINE);
        optionIds.forEach((id) => {
          const el = document.getElementById(id);
          if (el) el.checked = false;
        });
        inputEl.focus();
        apply();
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        const text = outputEl.value;
        if (!text || !text.trim()) {
          if (typeof window.showToast === "function") window.showToast("Nada para copiar", "info");
          return;
        }
        try {
          const ok = typeof window.copyTextToClipboard === "function" ? await window.copyTextToClipboard(text) : false;
          if (!ok) throw new Error("Clipboard not available");
          if (typeof window.showToast === "function") window.showToast("Copiado com sucesso!", "success");
        } catch (e) {
          if (typeof window.showToast === "function") window.showToast("Erro ao copiar", "error");
        }
      });
    }

    if (favoriteBtn) {
      favoriteBtn.addEventListener("click", () => {
        const out = outputEl.value;
        if (!out || !out.trim()) {
          if (typeof window.showToast === "function") window.showToast("Formate um texto primeiro", "info");
          return;
        }
        if (typeof window.openFavoriteFromCurrent === "function") {
          const state = getState();
          window.openFavoriteFromCurrent("text", inputEl.value, out, { ...state, wordsPerLine: getWordsPerLine() });
        }
      });
    }

    // aplicar ao carregar
    apply();

    global.TextFormatterUI = { apply };
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initTextFormatterUI);
    } else {
      initTextFormatterUI();
    }
  }
})(typeof window !== "undefined" ? window : this);

