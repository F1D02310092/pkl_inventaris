const mongoose = require("mongoose");

const barangSchema = new mongoose.Schema(
   {
      id_barang: {
         type: String,
         unique: true,
         trim: true,
         required: true,
      },
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
      image_url: {
         type: String,
         default: null,
      },
      status_upload: {
         type: String,
         default: "PENDING",
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
