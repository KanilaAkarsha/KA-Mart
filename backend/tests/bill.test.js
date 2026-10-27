const test = require("node:test");
const assert = require("node:assert/strict");
const {
  parseBillJson,
  matchBill,
  score,
} = require("../src/services/billScanner");
const P = [
  { _id: "a1", name: "iPhone 15 Silicone Back Cover", sku: "IPC-15" },
  { _id: "a2", name: "iPhone 14 Silicone Back Cover", sku: "IPC-14" },
  { _id: "a3", name: "USB-C Fast Charger 20W", sku: "CHG-20" },
];
test("parses fenced JSON, strips symbols, derives unit price from line total", () => {
  const r = parseBillJson(
    'Here you go:\n```json\n{"supplierName":"ABC","billDate":"2026-10-01","items":[{"name":"USB-C Charger 20W","quantity":"4 pcs","unitPrice":null,"lineTotal":"2,000.00"}],"discount":"50","transportOrOtherCharges":200,"grandTotal":2150}\n```',
  );
  assert.equal(r.items[0].qty, 4);
  assert.equal(r.items[0].unitPrice, 50000);
  assert.equal(r.discount, 5000);
  assert.equal(r.extraCosts, 20000);
  assert.equal(r.grandTotal, 215000);
  assert.equal(r.billDate, "2026-10-01");
});
test("rejects garbage and empty bills", () => {
  assert.throws(() => parseBillJson("no json here"));
  assert.throws(() => parseBillJson('{"items":[]}'), /No products/);
});
test("bad values are clamped, not trusted", () => {
  const r = parseBillJson(
    '{"items":[{"name":"X","quantity":-5,"unitPrice":99999999999}]}',
  );
  assert.equal(r.items[0].qty, 1);
  assert.equal(r.items[0].unitPrice, 0);
  assert.equal(
    parseBillJson('{"billDate":"yesterday","items":[{"name":"X"}]}').billDate,
    null,
  );
});
test("matches by name; model numbers must agree", () => {
  const m = matchBill(
    {
      items: [
        { name: "iphone 15 silicone cover", qty: 1, unitPrice: 1 },
        { name: "iPhone 13 Silicone Back Cover", qty: 1, unitPrice: 1 },
        { name: "Wireless Mouse", qty: 1, unitPrice: 1 },
      ],
      supplierName: null,
    },
    P,
    [],
  );
  assert.equal(m.items[0].product.id, "a1");
  assert.equal(m.items[1].product, null);
  assert.equal(m.items[2].product, null);
});
test("exact SKU/code on the bill wins", () => {
  const m = matchBill(
    { items: [{ name: "cover black", code: "ipc-14", qty: 1, unitPrice: 1 }] },
    P,
    [],
  );
  assert.equal(m.items[0].product.id, "a2");
  assert.equal(m.items[0].product.confidence, 1);
});
test("supplier matched by name", () => {
  const m = matchBill(
    { items: [], supplierName: "abc traders" },
    [],
    [{ _id: "s1", name: "ABC Traders" }],
  );
  assert.equal(m.supplier.id, "s1");
  assert.equal(score("abc shop", "abc shop"), 1);
});

const { extractBill, getProvider } = require("../src/services/billScanner");
const { start } = require("./mock-anthropic");
test("Anthropic, Gemini and OpenAI-style providers all read a bill", async () => {
  const srv = await start(0);
  const url = `http://127.0.0.1:${srv.address().port}`;
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  const keep = { ...process.env };
  const reset = () => {
    for (const k of Object.keys(process.env))
      if (!(k in keep)) delete process.env[k];
    Object.assign(process.env, keep);
    for (const k of [
      "GEMINI_API_KEY",
      "ANTHROPIC_API_KEY",
      "OPENAI_API_KEY",
      "OPENAI_BASE_URL",
      "BILL_AI_PROVIDER",
    ])
      delete process.env[k];
  };
  try {
    reset();
    Object.assign(process.env, {
      GEMINI_API_KEY: ' "test-key" ',
      GEMINI_BASE_URL: url,
    });
    assert.equal(getProvider(), "gemini");
    let r = parseBillJson(await extractBill(png, "image/png"));
    assert.equal(r.items[0].qty, 10);
    assert.equal(r.extraCosts, 20000);
    assert.equal(
      parseBillJson(
        await extractBill(Buffer.from("%PDF-1.4 x"), "application/pdf"),
      ).items.length,
      2,
    ); // Gemini reads PDFs
    reset();
    Object.assign(process.env, {
      ANTHROPIC_API_KEY: "test-key",
      ANTHROPIC_BASE_URL: url,
    });
    assert.equal(getProvider(), "anthropic");
    r = parseBillJson(await extractBill(png, "image/png"));
    assert.equal(r.items[1].unitPrice, 125000);
    reset();
    Object.assign(process.env, {
      OPENAI_API_KEY: "test-key",
      OPENAI_BASE_URL: url + "/v1",
    });
    assert.equal(getProvider(), "openai");
    r = parseBillJson(await extractBill(png, "image/png"));
    assert.equal(r.supplierName, "Sup A");
    await assert.rejects(
      () => extractBill(Buffer.from("%PDF-1.4 x"), "application/pdf"),
      /cannot read PDFs/,
    );
    reset();
    Object.assign(process.env, {
      GEMINI_API_KEY: "wrong",
      GEMINI_BASE_URL: url,
    });
    await assert.rejects(
      () => extractBill(png, "image/png"),
      /GEMINI_API_KEY must be a valid key/,
    );
    reset();
    Object.assign(process.env, {
      GEMINI_API_KEY: "test-key",
      ANTHROPIC_API_KEY: "x",
      GEMINI_BASE_URL: url,
    });
    assert.equal(getProvider(), "gemini"); // free option preferred when both set
    reset();
    assert.equal(getProvider(), null);
    await assert.rejects(
      () => extractBill(png, "image/png"),
      /GEMINI_API_KEY \(free/,
    );
  } finally {
    reset();
    srv.close();
  }
});

test("Gemini: busy model is retried, then the fallback model answers", async () => {
  const srv = await start(0);
  const url = `http://127.0.0.1:${srv.address().port}`;
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  const keep = { ...process.env };
  try {
    Object.assign(process.env, {
      GEMINI_API_KEY: "test-key",
      GEMINI_BASE_URL: url,
      GEMINI_MODEL: "flaky-model",
      GEMINI_FALLBACK_MODEL: "gemini-2.5-flash",
      BILL_RETRY_MS: "5",
    });
    delete process.env.ANTHROPIC_API_KEY;
    assert.equal(
      parseBillJson(await extractBill(png, "image/png")).items.length,
      2,
    );
    process.env.GEMINI_FALLBACK_MODEL = "flaky-model";
    await assert.rejects(
      () => extractBill(png, "image/png"),
      /overloaded|error 503/,
    ); // both busy: clear failure, no hang
  } finally {
    for (const k of [
      "GEMINI_API_KEY",
      "GEMINI_BASE_URL",
      "GEMINI_MODEL",
      "GEMINI_FALLBACK_MODEL",
      "BILL_RETRY_MS",
    ])
      delete process.env[k];
    Object.assign(process.env, keep);
    srv.close();
  }
});
