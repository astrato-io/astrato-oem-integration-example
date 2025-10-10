const axios = require("axios");
const { logMessage } = require("../utils");

async function getManagementApiToken(config = {}) {
  try {
    const astratoUrl = config.astratoUrl || process.env.ASTRATO_URL;
    const clientId = config.clientId || process.env.ASTRATO_CLIENT_ID;
    const clientSecret = config.clientSecret || process.env.ASTRATO_CLIENT_SECRET;

    const response = await axios.post(
      `${astratoUrl}auth/proxy/m2m/token`,
      {
        clientId,
        clientSecret,
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    return response.data.access_token;
  } catch (error) {
    logMessage(`Error getting management token: ${error.message}`);
    throw error;
  }
}

async function getSessionTicket(accessToken, email, groupIds = [], config = {}) {
  try {
    const astratoUrl = config.astratoUrl || process.env.ASTRATO_URL;
    
    const response = await axios.post(
      `${astratoUrl}oem/setup`,
      {
        email,
        groupIds,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data.ticket;
  } catch (error) {
    logMessage(`Error getting session ticket: ${error.message}`);
    throw error;
  }
}

module.exports = { getManagementApiToken, getSessionTicket };
