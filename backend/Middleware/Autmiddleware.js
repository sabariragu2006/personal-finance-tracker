const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "vaultfolio_secret_change_in_prod";

module.exports = function protect(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer "))
    return res.status(401).json({ message: "Not authorised. No token provided." });

  try {
    const token   = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId    = decoded.id; // attach user id to every protected request
    next();
  } catch {
    return res.status(401).json({ message: "Not authorised. Token invalid or expired." });
  }
};