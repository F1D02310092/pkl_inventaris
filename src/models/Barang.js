const mongoose = require("mongoose");

const barangSchema = new mongoose.Schema(
   {
      id_barang: {
         type: String,
         unique: true,
         trim: true,
         required: true,
         index: true,
      },
      nama_barang: {
         type: String,
         required: true,
         trim: true,
         index: true,
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
         index: true,
      },
      merek: {
         type: String,
         trim: true,
         index: true,
      },
      kategori: {
         type: String,
         required: true,
         trim: true,
         index: true,
      },
      satuan: {
         type: String,
         trim: true,
         index: true,
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
         },
      ],
   },
   {
      timestamps: true,
   },
);

barangSchema.index({ kategori: 1, createdAt: -1 });
barangSchema.index({ ruangan: 1, createdAt: -1 });

module.exports = mongoose.model("Barang", barangSchema);
