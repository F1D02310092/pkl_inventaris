require("dotenv").config();

const mongoose = require("mongoose");
const UserModel = require("../src/models/User.js");

const MONGO_URI = process.env.MONGO_URI;

// script run di console
// docker exec -it pkl-web_app-1 node src/seedAkun.js

const initialUsers = [
   {
      username: "admin",
      password: "inventaris2026",
      role: "admin",
   },
   {
      username: "user1",
      password: "user2026",
      role: "user",
   },
   // Anda bisa menambahkan akun lain di sini jika butuh (misal: user2, user3)
];

const createAccount = async () => {
   try {
      await mongoose.connect(MONGO_URI);
      console.log("Terhubung ke DB untuk Seeding");

      for (const user of initialUsers) {
         const existingUser = await UserModel.findOne({ username: user.username });

         if (existingUser) {
            console.log(`Akun '${user.username}' sudah ada di database! Melewati...`);
         } else {
            const newUser = new UserModel(user);
            await newUser.save();
            console.log(`Sukses seeding akun: ${user.username} (Role: ${user.role})`);
         }
      }

      console.log("Proses seeding selesai!");
      process.exit(0);
   } catch (error) {
      console.error("Gagal seeding:", error);
      process.exit(1);
   }
};

createAccount();
