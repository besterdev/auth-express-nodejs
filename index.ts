import express from "express";

const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser");

app.use(express.json());
app.use(cookieParser());
app.use(cors());

app.listen(3001, () => {
  console.log("Server running on port 3001");
});
