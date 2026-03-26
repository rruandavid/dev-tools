// Self-test (node) for text formatter transforms.
// Run: `node scripts/text-formatter.selftest.js`
const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const path = require("path");

const toolPath = path.join(__dirname, "..", "js", "textFormatter.js");
const src = fs.readFileSync(toolPath, "utf8");

const sandbox = { window: {}, Intl, console };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: toolPath });

const { TextFormatterTool } = sandbox;
assert.ok(TextFormatterTool, "TextFormatterTool deve existir");

const apply = (text, state, x) => TextFormatterTool.applyPipeline(text, state, x).text;

assert.equal(apply("ação", { optRemoveAccents: true }, 10), "acao");
assert.equal(apply("A  B", { optRemoveExtraSpaces: true }, 10), "A B");
assert.equal(apply("casa azul", { optReverseWordOrder: true }, 10), "azul casa");
assert.equal(apply("casa azul", { optReverseWordsKeepOrder: true }, 10), "asac luza");
assert.equal(apply("Meu Texto!", { optSlugify: true }, 10), "meu-texto");
assert.equal(apply("1a2b3", { optOnlyNumbers: true }, 10), "123");
assert.equal(apply("1a2b3", { optOnlyLetters: true }, 10), "ab");
assert.equal(apply("oi oi tudo", { optRemoveDuplicateWords: true }, 10).replace(/\s+/g, " ").trim(), "oi tudo");
assert.equal(apply("um dois tres quatro", { optBreakEveryXWords: true }, 2), "um dois\ntres quatro");

console.log("OK: text formatter self-test passou");

