const axios = require('axios');

const KEYCLOAK_URL = 'http://localhost:8080/realms/airvana/protocol/openid-connect/token';

const login = async () => {
  try {
    const response = await axios.post(KEYCLOAK_URL, new URLSearchParams({
        client_id: 'airvana-client',       // deve essere pubblico
        username: 'admin@airvana.com',     // corretto!
        password: 'airvana',
        grant_type: 'password',
    }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    console.log('✅ Access Token:\n', response.data.access_token);
  } catch (error) {
    console.error('❌ Errore login:', error.response?.data || error.message);
  }
};

login();
