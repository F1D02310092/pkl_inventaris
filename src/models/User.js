const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
   username: {
      type: String,
      unique: true,
      required: true,
      trim: true,
   },
   password: {
      type: String,
      required: true,
      trim: true,
   },
   // role: {
   //    type: String,
   //    enum: ["Admin", "Petugas"],
   //    default: "Petugas",
   // },
});

userSchema.pre("save", async function () {
   if (!this.isModified("password")) return;

   const salt = await bcrypt.genSalt(10);
   this.password = await bcrypt.hash(this.password, salt);
});

module.exports = mongoose.model("User", userSchema);
