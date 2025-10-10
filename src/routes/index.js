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
  const email = req.body.email;
  const astratoUrl = req.body.astrato_url;
  const clientId = req.body.astrato_client_id;
  const clientSecret = req.body.astrato_client_secret;
  const embedLink = req.body.astrato_embed_link;

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

      const managementToken = await getManagementApiToken(config);
      req.session.ticketId = await getSessionTicket(managementToken, email, [], config);
      res.redirect("/");
    } catch (error) {
      logMessage(`Login error: ${error.message}`);
      res.status(500).send(`Login failed: ${error.message}`);
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
        config
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
