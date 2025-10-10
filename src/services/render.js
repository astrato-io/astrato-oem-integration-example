const fs = require("fs/promises");
const Mustache = require("mustache");
const path = require("path");

async function renderTemplate(templateName, data = {}) {
  const filePath = path.join(
    __dirname,
    "..",
    "templates",
    `${templateName}.html`
  );
  const template = await fs.readFile(filePath, "utf8");
  return Mustache.render(template, data);
}

module.exports = { renderTemplate };
