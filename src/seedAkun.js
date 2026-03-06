require("dotenv").config();

const mongoose = require("mongoose");
const UserModel = require("../src/models/User.js");

const MONGO_URI = process.env.MONGO_URI;

const createAccount = async () => {
   try {
      await mongoose.connect(MONGO_URI);
      console.log("Terhubung ke DB untuk Seeding");

      const existingUser = await UserModel.findOne({ username: "Admin" });
      if (existingUser) {
         console.log("Akun Admin sudah ada di database!");
         process.exit(0);
      }

      const newUser = new UserModel({
         username: "Admin",
         password: "adminpassword123",
      });

      await newUser.save();
      console.log("Sukses seeding admin akun!");

      process.exit(0);
   } catch (error) {
      console.error("Gagal seeding:", error);
      process.exit(1);
   }
};

createAccount();
