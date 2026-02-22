if (process.env.NODE_ENV !== "production") {
   require("dotenv").config();
}

const express = require("express");
const app = express();
const PORT = process.env.PORT;
const engine = require("ejs-mate");
const path = require("path");
const mongoose = require("mongoose");
const methodOverride = require("method-override");

// init mongosh
const MONGO_URI = process.env.MONGO_URI;
const main = async function () {
   try {
      await mongoose.connect(MONGO_URI);
      console.log("Connected to MongoDB!");
   } catch (err) {
      console.error("Connection error:", err);
   }
};
main();

// setting view engine
app.engine("ejs", engine);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// setting req.body parser utk input form
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));

// home page
app.get("/", (req, res) => {
   return res.render("home.ejs");
});

// admin routes
const adminRoutes = require("./routes/adminRoutes.js");
app.use("/admin", adminRoutes);

// cek health system
app.get("/health", (req, res) => {
   return res.status(200).json({
      message: "Connected succesfully",
   });
});

// entry point
const { startMQ } = require("./config/mq.js");
async function startAPI() {
   await startMQ();

   app.listen(PORT, () => {
      console.log(`Listening on port: ${PORT}`);
   });
}
startAPI();
