const multer = require("multer");
const fs = require("fs");
const path = require("path");

const tempDir = path.join(__dirname, "../../temp");

if (!fs.existsSync(tempDir)) {
   fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
   destination: function (req, file, cb) {
      cb(null, tempDir);
   },

   filename: function (req, file, cb) {
      cb(null, Date.now() + "-" + file.originalname);
   },
});

const upload = multer({ storage: storage });

module.exports = { upload };

/**
 * Konfigurasi multer untuk handle upload gambar ke storage server
 */
