const pg = require("pg");
const express = require("express");
let axios = require("axios");
const app = express();
app.use(express.json());
const port = 3000;
const hostname = "localhost";

//API Connection
let apiFile = require("../env.json");
let apiKey = apiFile["api_key"]; // use this to make requests
let baseUrl = apiFile["api_url"]; // use this to make requests

//DB Connection
const env = require("../env.json");
const Pool = pg.Pool;
const pool = new Pool(env);
pool.connect().then(function () {
  console.log(`Connected to database ${env.database}`);
});

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});
app.listen(port, hostname, () => {
  console.log(`Listening at: http://${hostname}:${port}`);
});