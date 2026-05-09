module.exports = function errorHandler(err, req, res, next) {
  const status = Number(err?.statusCode || err?.status || err?.code || 500);
  const safeStatus = status >= 400 && status <= 599 ? status : 500;

  if (safeStatus >= 500) {
    // Avoid logging request bodies / credentials; log the error object only.
    console.error(err);
  }

  const message =
    safeStatus >= 500
      ? "Server error"
      : String(err?.message || "Request failed");

  res.status(safeStatus).json({ message });
};

