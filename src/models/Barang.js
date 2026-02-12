const mongoose = require("mongoose");

const barangSchema = new mongoose.Schema({
   nama_barang: {
      type: String,
      required: true,
      trim: true,
   },
   nomor_seri: {
      type: String,
      required: true,
      unique: true,
      trim: true,
   },
   created_at: {
      type: Date,
      default: Date.now,
   },
});

module.exports = mongoose.model("Barang", barangSchema);
