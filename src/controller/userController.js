const passport = require("passport");

const getLoginPage = (req, res) => {
   if (req.isAuthenticated()) return res.redirect("/admin/check-inventory");
   res.render("auth/login.ejs");
};

const postLogin = async (req, res) => {
   req.flash("success", "Berhasil login");
   const redirectUrl = res.locals.returnTo || "/";

   return res.redirect(redirectUrl);
};

const logout = (req, res, next) => {
   req.logOut(function (err) {
      if (err) {
         return res.redirect("/");
      }

      req.flash("success", "Logged Out");
      return res.redirect("/");
   });
};

// middlewares
const isLoggedIn = (req, res, next) => {
   // built-in method dari passport yg nempel di 'req'
   if (!req.isAuthenticated()) {
      req.session.returnTo = req.originalUrl;
      req.flash("error", "Mohon login terlebih dahulu!");
      return res.redirect("/login");
   }
   next();
};

const storeReturnTo = (req, res, next) => {
   if (req.session.returnTo) {
      res.locals.returnTo = req.session.returnTo;
   }
   next();
};

module.exports = {
   getLoginPage,
   postLogin,
   isLoggedIn,
   storeReturnTo,
   logout,
};
