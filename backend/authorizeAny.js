// Permit cross-feature reads only when one of the explicitly listed workflows
// is authorized for the authenticated principal.
export const authorizeAny = (authorize, permissions) => async (req, res, next) => {
  const { distributorId, firmId, userId, role } = req.auth || {};
  if (!distributorId || !firmId || !userId) {
    return res.status(401).json({ success: false, message: "User session not found." });
  }
  try {
    for (const permission of permissions) {
      if (await authorize(distributorId, firmId, userId, role, ...permission)) return next();
    }
    return res.status(403).json({ success: false, message: "You do not have permission." });
  } catch (error) {
    return next(error);
  }
};
