import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { stripTypeScriptTypes } from "node:module";
import { fileURLToPath } from "node:url";

const testDirectory = fileURLToPath(new URL(".", import.meta.url));

const source = fs.readFileSync(testDirectory + "../lib/tvRotacao.ts", "utf8");
const context = { URL, process: { env: {} } };
vm.createContext(context);
vm.runInContext(stripTypeScriptTypes(source).replace("export function", "function"), context);
const getGccTvUrl = context.getGccTvUrl;

test("default GCC URL includes TV entry and the originating SAT dashboard", () => {
  for (const origin of ["http://localhost:3000", "https://aliceapp.ia.br"]) {
    const url = new URL(getGccTvUrl(origin));
    assert.equal(url.origin, "https://gcc.colegiosatelite.cloud");
    assert.equal(url.searchParams.get("tv"), "sat");
    assert.equal(url.searchParams.get("voltar"), origin + "/dashboard/view");
  }
});

test("empty configuration disables GCC while an unset configuration uses the default", () => {
  assert.equal(getGccTvUrl("http://localhost:3000", ""), null);
  assert.equal(getGccTvUrl("http://localhost:3000", "  "), null);
  context.process.env.NEXT_PUBLIC_GCC_TV_URL = "";
  assert.equal(getGccTvUrl("http://localhost:3000"), null);
  delete context.process.env.NEXT_PUBLIC_GCC_TV_URL;
  assert.ok(getGccTvUrl("http://localhost:3000"));
});

test("configured GCC URL preserves unrelated parameters and replaces old return values", () => {
  const url = new URL(getGccTvUrl("http://localhost:3000",
    "https://gcc.colegiosatelite.cloud/?theme=dark&tv=other&voltar=old"));
  assert.equal(url.searchParams.get("theme"), "dark");
  assert.equal(url.searchParams.get("tv"), "sat");
  assert.equal(url.searchParams.get("voltar"), "http://localhost:3000/dashboard/view");
});

test("invalid GCC addresses fall back to the SAT cycle", () => {
  for (const address of ["invalid", "/relative", "javascript:alert(1)", "ftp://example.test",
    "https://user:password@example.test"]) {
    assert.equal(getGccTvUrl("http://localhost:3000", address), null);
  }
});

const page = fs.readFileSync(testDirectory + "../app/dashboard/agendamentos-tv/page.tsx", "utf8");
function effectContaining(text) {
  const position = page.indexOf(text);
  assert.ok(position >= 0);
  const start = page.lastIndexOf("  useEffect(() => {", position);
  const end = page.indexOf("\n  }, [", position);
  const body = page.slice(start + "  useEffect(() => {".length, end);
  return stripTypeScriptTypes("function runEffect() {" + body + "\n}");
}

test("restored browser page reloads, ordinary page show does not, and listener is removed", () => {
  let listener, removed, reloads = 0;
  const sandbox = { window: {
    location: { reload() { reloads++; } },
    addEventListener(name, callback) { assert.equal(name, "pageshow"); listener = callback; },
    removeEventListener(name, callback) { assert.equal(name, "pageshow"); removed = callback; },
  } };
  vm.runInNewContext(effectContaining("function handlePageShow") + "\ncleanup = runEffect();", sandbox);
  listener({ persisted: false }); assert.equal(reloads, 0);
  listener({ persisted: true }); assert.equal(reloads, 1);
  sandbox.cleanup(); assert.equal(removed, listener);
});

test("automatic countdown visits GCC, or tasks when GCC is disabled, and supports cleanup", () => {
  for (const configuredUrl of [undefined, ""]) {
    let scheduled, cancelled, external, internal;
    const sandbox = {
      secondsRemaining: 0, hasNavigatedRef: { current: false }, setIsLeaving() {},
      getGccTvUrl: origin => getGccTvUrl(origin, configuredUrl),
      router: { replace(url) { internal = url; } },
      window: {
        location: { origin: "http://localhost:3000", replace(url) { external = url; } },
        setTimeout(callback, ms) { assert.equal(ms, 520); scheduled = callback; return 7; },
        clearTimeout(id) { cancelled = id; },
      },
    };
    vm.runInNewContext(effectContaining("const gccUrl =") + "\ncleanup = runEffect();", sandbox);
    scheduled();
    if (configuredUrl === "") {
      assert.equal(internal, "/dashboard/view"); assert.equal(external, undefined);
    } else {
      assert.equal(new URL(external).searchParams.get("voltar"), "http://localhost:3000/dashboard/view");
      assert.equal(internal, undefined);
    }
    sandbox.cleanup(); assert.equal(cancelled, 7);
  }
});
