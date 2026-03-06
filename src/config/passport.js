const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");
const UserModel = require("../models/User");

module.exports = function (passport) {
   passport.use(
      new LocalStrategy({ usernameField: "username" }, async (username, password, done) => {
         try {
            const user = await UserModel.findOne({ username: username });
            if (!user) {
               return done(null, false, { message: "Username tidak terdaftar" });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
               return done(null, user);
            } else {
               return done(null, false, { message: "Password salah" });
            }
         } catch (error) {
            return done(error);
         }
      }),
   );

   passport.serializeUser((user, done) => {
      done(null, user.id);
   });

   passport.deserializeUser(async (id, done) => {
      try {
         const user = await UserModel.findById(id);
         done(null, user);
      } catch (error) {
         done(error, null);
      }
   });
};
