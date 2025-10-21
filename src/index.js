const express = require("express");
const session = require("express-session");
require("dotenv").config();

const routes = require("./routes");

const app = express();
const PORT = process.env.PORT || 3333;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // Set true in prod
  })
);

app.use("/", routes);
app.use(express.static("public"));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
