const { Pool } = require("pg");

// const pool = new Pool({
//   host: "localhost",
//   port: 5432,
//   user: "postgres",
//   password: "123",
//   database: "itnews",
// });

const pool = new Pool({
  connectionString: "postgres://postgres:123@localhost:5432/itnews",
});

// const DATABASE = process.env.PG_DATABASE;
// const USER = process.env.PG_USER;
// const PASSWORD = process.env.PG_PASSWORD;
// const HOST = process.env.PG_HOST;
// const PORT = process.env.PG_PORT;

// const pool = new Pool({
//   connectionString: `postgres://${USER}:${PASSWORD}@${HOST}:${PORT}/${DATABASE}`,
// });

pool.on("error", (err) => {
  console.log("Error: " + err);
  process.exit(-1);
});

module.exports = pool;
