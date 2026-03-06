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
const flash = require("connect-flash");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const MongoStore = require("connect-mongo");

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

// serving public dir
app.use(express.static(path.join(__dirname, "public")));

// setting req.body parser utk input form
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));

const SESSION_SECRET = process.env.SESSION_SECRET;
const store = MongoStore.create({
   mongoUrl: MONGO_URI,
   touchAfter: 24 * 3600,
   crypto: {
      SESSION_SECRET,
   },
});

store.on("error", (err) => {
   console.log(err);
});

const sessionObject = {
   store,
   name: "inventorysys",
   secret: SESSION_SECRET,
   resave: false,
   saveUninitialized: true,
   rolling: true,
   cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
   },
};

app.use(session(sessionObject));
app.set("trust proxy", 1);

// passport
require("./config/passport")(passport);
app.use(passport.initialize());
app.use(passport.session());

// middleware
app.use(flash());
app.use((req, res, next) => {
   res.locals.currentPath = req.path;

   res.locals.currUser = req.user;
   res.locals.successFlashMsg = req.flash("success");
   res.locals.errorFlashMsg = req.flash("error");
   next();
});

// home page
const { getDashboardPage } = require("../src/controller/dashboard.js");
app.get("/", getDashboardPage);

const authRoutes = require("../src/routes/authRoutes.js");
app.use("/", authRoutes);

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
   await startMQ().then(
      app.listen(PORT, () => {
         console.log(`Listening on port: ${PORT}`);
      }),
   );
}
startAPI();
