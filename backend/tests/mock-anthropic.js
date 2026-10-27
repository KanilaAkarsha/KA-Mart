// Fake AI APIs (Anthropic, Gemini, OpenAI-style) for testing bill scanning without real keys: PORT=4010 node tests/mock-anthropic.js
const http = require("http");
const OUT = {
  supplierName: "Sup A",
  billDate: "2026-10-18",
  billNumber: "B-123",
  items: [
    {
      name: "iPhone silicone back cover",
      quantity: 10,
      unitPrice: 290,
      lineTotal: 2900,
    },
    { name: "Unknown Gadget X", quantity: "2 pcs", unitPrice: "1,250.00" },
  ],
  discount: 0,
  transportOrOtherCharges: 200,
  grandTotal: 5600,
};
const json = (res, code, o) => {
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(o));
};
const handler = (req, res) => {
  let b = "";
  req.on("data", (c) => (b += c));
  req.on("end", () => {
    const j = JSON.parse(b || "{}");
    const h = req.headers;
    const url = req.url;
    if (url === "/v1/messages") {
      const blk = j.messages?.[0]?.content?.[0];
      if (
        h["x-api-key"] !== "test-key" ||
        !["image", "document"].includes(blk?.type) ||
        !blk.source?.data
      )
        return json(res, 401, {
          type: "error",
          error: { type: "authentication_error", message: "invalid x-api-key" },
        });
      return json(res, 200, {
        content: [
          {
            type: "text",
            text: "Sure!\n```json\n" + JSON.stringify(OUT) + "\n```",
          },
        ],
      });
    }
    if (url.startsWith("/v1beta/models/") && url.includes(":generateContent")) {
      const part = j.contents?.[0]?.parts?.[0]?.inline_data;
      if (url.includes("flaky-model"))
        return json(res, 503, {
          error: { message: "The model is overloaded." },
        });
      if (h["x-goog-api-key"] !== "test-key")
        return json(res, 400, {
          error: {
            code: 400,
            message: "API key not valid. Please pass a valid API key.",
            status: "INVALID_ARGUMENT",
          },
        });
      if (!part?.data || !part.mime_type)
        return json(res, 400, { error: { message: "bad request" } });
      return json(res, 200, {
        candidates: [{ content: { parts: [{ text: JSON.stringify(OUT) }] } }],
      });
    }
    if (url === "/v1/chat/completions" || url === "/chat/completions") {
      const img = j.messages?.[0]?.content?.find((x) => x.type === "image_url");
      if (h.authorization !== "Bearer test-key")
        return json(res, 401, {
          error: { message: "Incorrect API key provided" },
        });
      if (!img?.image_url?.url?.startsWith("data:image/"))
        return json(res, 400, { error: { message: "bad image" } });
      return json(res, 200, {
        choices: [
          { message: { content: "```json\n" + JSON.stringify(OUT) + "\n```" } },
        ],
      });
    }
    json(res, 404, { error: { message: "not found" } });
  });
};
const start = (port) =>
  new Promise((ok) => {
    const s = http.createServer(handler).listen(port, () => ok(s));
  });
if (require.main === module) start(process.env.PORT || 4010);
module.exports = { start };
