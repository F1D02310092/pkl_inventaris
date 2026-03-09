const express = require("express");
const router = express.Router();
const passport = require("passport");
const { getLoginPage, postLogin, storeReturnTo, logout, isLoggedIn } = require("../controller/userController.js");
const { validate, loginSchema } = require("../validation_sanitize/validator.js");
const { loginLimiter } = require("../security/rateLimit.js");

router
   .route("/login")
   .get(getLoginPage)
   .post(storeReturnTo, loginLimiter, validate(loginSchema), passport.authenticate("local", { failureFlash: true, failureRedirect: "/login" }), postLogin);
router.route("/logout").get(isLoggedIn, logout);

module.exports = router;
