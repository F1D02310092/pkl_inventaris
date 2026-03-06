const express = require("express");
const router = express.Router();
const passport = require("passport");
const { getLoginPage, postLogin, storeReturnTo, logout, isLoggedIn } = require("../controller/userController.js");

router
   .route("/login")
   .get(getLoginPage)
   .post(storeReturnTo, passport.authenticate("local", { failureFlash: true, failureRedirect: "/login" }), postLogin);
router.route("/logout").get(isLoggedIn, logout);

module.exports = router;
