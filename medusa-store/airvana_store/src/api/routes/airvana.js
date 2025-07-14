const express = require('express');
const router = express.Router();
const checkKeycloakRole = require('../../middleware/keycloakAuth');

// Solo per agronomi e agricoltori
router.get('/campi', checkKeycloakRole(['agronomo_forestale', 'agricoltore']), (req, res) => {
  res.json({ messaggio: "Accesso a dati dei campi" });
});

// Solo per aziende
router.post('/ordina', checkKeycloakRole(['azienda']), (req, res) => {
  res.json({ messaggio: "Ordine ricevuto" });
});

module.exports = router;
