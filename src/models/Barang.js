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
      image_url: {
         type: String,
         default: null,
      },
      image_name: {
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
      jumlah: {
         type: Number,
         required: true,
         trim: true,
      },
      ruangan: {
         type: String,
         required: true,
         trim: true,
      },
      merek: {
         type: String,
         trim: true,
      },
      kategori: {
         type: String,
         required: true,
         trim: true,
      },
      satuan: {
         type: String,
         trim: true,
      },

      // pengecekkan kondisi barang
      kondisi: {
         type: String,
         enum: ["Baik", "Rusak Ringan", "Rusak Berat", "Belum Dicek"],
         default: "Belum Dicek",
      },
      jadwal_pengecekan: {
         type: String,
         enum: ["Harian", "Mingguan", "Bulanan", "Tahunan", "Tak Terjadwal"],
         default: "Tak Terjadwal",
      },
      riwayat_pengecekan: [
         {
            tanggal: { type: Date, default: Date.now },
            kondisi: {
               type: String,
               enum: ["Baik", "Rusak Ringan", "Rusak Berat", "Belum Dicek"],
            },
            catatan: String,
         },
      ],
   },
   {
      timestamps: true,
   },
);

module.exports = mongoose.model("Barang", barangSchema);
