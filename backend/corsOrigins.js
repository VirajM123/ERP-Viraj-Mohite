const normalizeOrigin = (value) => {
  try {
    const parsed = new URL(String(value || "").trim());
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.origin : "";
  } catch {
    return "";
  }
};

export const buildAllowedOrigins = (configuredOrigins = "") => {
  const allowed = new Set();

  for (const value of String(configuredOrigins).split(",")) {
    const origin = normalizeOrigin(value);
    if (!origin) continue;
    allowed.add(origin);

  }

  return allowed;
};

export const corsOriginAllowed = (origin, allowedOrigins) =>
  !origin || allowedOrigins.has(normalizeOrigin(origin));
