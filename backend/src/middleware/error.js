exports.notFound = (req, res) => res.status(404).json({ error: "Not found" });
exports.errorHandler = (err, req, res, next) => {
  if (err.name === "ZodError")
    return res
      .status(400)
      .json({ error: "Validation failed", details: err.issues });
  if (err.code === 11000)
    return res.status(409).json({
      error: "Duplicate record (invoice, SKU or payment already processed)",
    });
  res.status(err.status || 400).json({ error: err.message });
};
