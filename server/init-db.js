"use strict";

const config = require("./config");
const { openDatabase } = require("./db");

const db = openDatabase(config.databasePath);
db.close();
console.log(`Database ready at ${config.databasePath}`);
