const mongoose = require("mongoose");

const barangSchema = new mongoose.Schema(
   {
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
      detail: {
         type: mongoose.Schema.Types.Mixed,
         default: {},
      },
   },
   {
      timestamps: true,
   },
);

module.exports = mongoose.model("Barang", barangSchema);
