const multer = require("multer");
// Detect real file type from its first bytes (never trust the filename or declared type).
const sniff = (b) =>
  b.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
    ? "jpg"
    : b
          .subarray(0, 8)
          .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
      ? "png"
      : b.subarray(0, 4).toString() === "RIFF" &&
          b.subarray(8, 12).toString() === "WEBP"
        ? "webp"
        : b.subarray(0, 5).toString() === "%PDF-"
          ? "pdf"
          : null;
const MIME = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};
const upload = (mb) =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: mb * 1024 * 1024, files: 1 },
  });
module.exports = { sniff, MIME, upload };
