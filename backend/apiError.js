// Keep parser, router and database exceptions out of public responses.
export const apiErrorHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  const failures = {
    "entity.parse.failed": [400, "INVALID_JSON", "Request body must contain valid JSON."],
    "entity.too.large": [413, "PAYLOAD_TOO_LARGE", "Request body is too large."],
    "CORS_ORIGIN_DENIED": [403, "CORS_ORIGIN_DENIED", "This website origin is not allowed."],
  };
  const [status, code, message] = failures[error?.type] || failures[error?.code] ||
    (error?.code === 11000
      ? [409, "DUPLICATE_RECORD", "This record already exists."]
      : [500, "INTERNAL_ERROR", "The request could not be completed."]);
  return res.status(status).json({ success: false, code, message });
};
