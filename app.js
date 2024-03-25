const express = require("express");
const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");

const app = express();
const dotenv = require("dotenv");
const db = require("./database");

// Swagger UI
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger.json");

app.use(fileUpload());
app.use("/api/v2/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

dotenv.config();

app.use(express.json());

// for parsing application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

// for parsing multipart/form-data
// app.use(upload.array());
app.use(express.static("public"));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "PUT, POST, PATCH, DELETE, GET");
    return res.status(200).json({});
  }
  next();
});

app.use((error, req, res, next) => {
  res.status(error.status || 500).json({
    message: error,
  });
});

const apiUrl2 = "/api/v2";

// Account
app.use(`${apiUrl2}/account`, require("./routers/AccountRouter"));

// Role
app.use(`${apiUrl2}/role`, require("./routers/RoleRouter"));

// Tag
app.use(`${apiUrl2}/tag`, require("./routers/TagRouter"));

// Post
app.use(`${apiUrl2}/post`, require("./routers/PostRouter"));

// Vote
app.use(`${apiUrl2}/vote`, require("./routers/VoteRouter"));

// Bookmark
app.use(`${apiUrl2}/bookmark`, require("./routers/BookmarkRouter"));

// Follow Tag
app.use(`${apiUrl2}/follow_tag`, require("./routers/Follow_TagRouter"));

// Follow Account
app.use(`${apiUrl2}/follow_account`, require("./routers/Follow_AccountRouter"));

// Comment
app.use(`${apiUrl2}/post`, require("./routers/CommentRouter"));

// update image
app.use(`${apiUrl2}/image`, require("./routers/CommentRouter"));

// notification
app.use(`${apiUrl2}/notification`, require("./routers/NotificationRouter"));

// information
app.use(`${apiUrl2}/information`, require("./routers/InformationRouter"));

//feedback
app.use(`${apiUrl2}/feedback`, require("./routers/FeedbackRouter"));

module.exports = app;
