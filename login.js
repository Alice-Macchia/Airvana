const axios = require("axios");

const main = async () => {
  try {
    const response = await axios.post("http://localhost:9000/admin/auth/login", {
      email: "admin@airvana.com",
      password: "airvana"
    });

    console.log("Access token:", response.data.access_token);
  } catch (err) {
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Data:", err.response.data);
      console.error("Headers:", err.response.headers);
    } else if (err.request) {
      console.error("No response received:", err.request);
    } else {
      console.error("Errore:", err.message);
    }
  }
};

main();
