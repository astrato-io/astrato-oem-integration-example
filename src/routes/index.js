const express = require("express");
const { getManagementApiToken, getSessionTicket } = require("../services/auth");
const { logMessage } = require("../utils");
const { renderTemplate } = require("../services/render");

const router = express.Router();

router.get('/', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  // Use stored config or fall back to environment variables
  const astratoUrl = req.session.astratoConfig?.url || process.env.ASTRATO_URL;
  const embedLink = req.session.astratoConfig?.embedLink || process.env.ASTRATO_EMBED_LINK;

  const html = await renderTemplate('index', {
    USER: req.session.user,
    ASTRATO_EMBED_LINK: embedLink,
    ASTRATO_URL: astratoUrl,
    TICKET_SCRIPT: req.session.ticketId
      ? `<script>
           fetch('${astratoUrl}auth/proxy/oem/ticket/${req.session.ticketId}?embed', {credentials: 'include'}).then(r => r.json()).then(console.log);
         </script>`
      : ''
  });

  if (req.session.ticketId) {
    req.session.ticketId = null;
  }

  res.send(html);
});

router.get('/login', async (req, res) => {
  const html = await renderTemplate('login');
  res.send(html);
});

router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) logMessage(`Logout error: ${err.message}`);
    res.redirect("/login");
  });
});

router.post("/login", async (req, res) => {
  const email = req.body?.email;
  const astratoUrl = req.body?.astrato_url;
  const clientId = req.body?.astrato_client_id;
  const clientSecret = req.body?.astrato_client_secret;
  const embedLink = req.body?.astrato_embed_link;
  const groupIds = req.body?.group_ids;
  const filterParameters = req.body?.filter_parameters;
  const applyPendingInvites = req.body?.apply_pending_invites === 'true';

  if (email) {
    try {
      req.session.user = email;
      
      // Store configuration in session if provided
      if (astratoUrl || clientId || clientSecret || embedLink) {
        req.session.astratoConfig = {
          url: astratoUrl || null,
          clientId: clientId || null,
          clientSecret: clientSecret || null,
          embedLink: embedLink || null
        };
      }

      // Create config object for auth functions
      const config = {
        astratoUrl: astratoUrl || process.env.ASTRATO_URL,
        clientId: clientId || process.env.ASTRATO_CLIENT_ID,
        clientSecret: clientSecret || process.env.ASTRATO_CLIENT_SECRET
      };

      // Process groupIds - split by comma and trim whitespace
      const processedGroupIds = groupIds 
        ? groupIds.split(',').map(id => id.trim()).filter(id => id.length > 0)
        : [];

      // Process filterParameters - parse JSON if provided
      let processedFilterParameters = null;
      if (filterParameters && filterParameters.trim()) {
        try {
          processedFilterParameters = JSON.parse(filterParameters);
        } catch (error) {
          logMessage(`Invalid JSON in filterParameters: ${error.message}`);
          return res.status(400).send(`Invalid JSON in filter parameters: ${error.message}`);
        }
      }

      const managementToken = await getManagementApiToken(config);
      req.session.ticketId = await getSessionTicket(
        managementToken, 
        email, 
        processedGroupIds, 
        config,
        applyPendingInvites,
        processedFilterParameters
      );
      
      res.redirect("/");
    } catch (error) {
      logMessage(`Login error: ${error.message}`);
      
      // Build comprehensive error details
      const errorDetails = {
        message: error.message,
        timestamp: new Date().toISOString(),
        request: {
          email: email,
          astratoUrl: astratoUrl || process.env.ASTRATO_URL,
          clientIdProvided: clientId ? true : false,
          clientSecretProvided: clientSecret ? true : false,
          embedLink: embedLink,
          groupIds: groupIds,
          filterParameters: filterParameters,
          applyPendingInvites: applyPendingInvites
        }
      };
      
      if (error.response) {
        errorDetails.apiResponse = error.response.data;
        errorDetails.apiUrl = error.config?.url;
        errorDetails.apiMethod = error.config?.method?.toUpperCase();
        errorDetails.apiStatus = error.response.status;
      }
      
      // Prepare template data
      const templateData = {
        TIMESTAMP: errorDetails.timestamp,
        ERROR_MESSAGE: error.message,
        REQUEST_EMAIL: email,
        REQUEST_ASTRATO_URL: astratoUrl || process.env.ASTRATO_URL,
        REQUEST_CLIENT_ID_STATUS: clientId ? '✓ Provided' : '✗ Not provided',
        REQUEST_CLIENT_SECRET_STATUS: clientSecret ? '✓ Provided' : '✗ Not provided',
        REQUEST_EMBED_LINK: embedLink || 'Not provided',
        REQUEST_GROUP_IDS: groupIds || 'Not provided',
        REQUEST_FILTER_PARAMETERS: filterParameters || 'Not provided',
        REQUEST_APPLY_PENDING_INVITES: applyPendingInvites ? 'Yes' : 'No',
        ERROR_DETAILS_JSON: JSON.stringify(errorDetails),
        HAS_API_ERROR: error.response ? true : false
      };
      
      // Add API error details if available
      if (error.response) {
        templateData.API_STATUS = errorDetails.apiStatus;
        templateData.API_METHOD = errorDetails.apiMethod || 'N/A';
        templateData.API_URL = errorDetails.apiUrl || 'N/A';
        templateData.API_MESSAGE = errorDetails.apiResponse?.message;
        templateData.API_CODE = errorDetails.apiResponse?.code;
        templateData.API_CORRELATION_ID = errorDetails.apiResponse?.correlationId;
        templateData.API_RESPONSE_JSON = JSON.stringify(errorDetails.apiResponse, null, 2);
      }
      
      // Render error page using template
      const errorHtml = await renderTemplate('error', templateData);
      res.status(500).send(errorHtml);
    }
  } else {
    res.status(400).send("Invalid email");
  }
});

router.post("/external-relogin", async (req, res) => {
  if (req.session.user) {
    try {
      // Use stored config or fall back to environment variables
      const config = {
        astratoUrl: req.session.astratoConfig?.url || process.env.ASTRATO_URL,
        clientId: req.session.astratoConfig?.clientId || process.env.ASTRATO_CLIENT_ID,
        clientSecret: req.session.astratoConfig?.clientSecret || process.env.ASTRATO_CLIENT_SECRET
      };

      const managementToken = await getManagementApiToken(config);
      const ticketId = await getSessionTicket(
        managementToken,
        req.session.user,
        [],
        config,
        false, // applyPendingInvites - default to false for external relogin
        null   // filterParameters - default to null for external relogin
      );
      res.json({ ticketId });
    } catch (error) {
      logMessage(`External relogin error: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
});

module.exports = router;
