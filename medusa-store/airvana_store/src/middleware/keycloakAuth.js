const jwt = require('jsonwebtoken');

function checkKeycloakRole(allowedRoles) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token mancante o non valido" });
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.decode(token, { complete: true });
      const roles = decoded.payload.realm_access?.roles || [];

      const hasRole = roles.some(role => allowedRoles.includes(role));
      if (!hasRole) {
        return res.status(403).json({ message: "Accesso negato: ruolo non autorizzato" });
      }

      req.user = decoded.payload;
      next();
    } catch (err) {
      return res.status(401).json({ message: "Token non valido" });
    }
  };
}

module.exports = checkKeycloakRole;
