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
      const cleanFileName = file.originalname.replace(/[^a-zA-Z0-9.]/g, "_");
      cb(null, Date.now() + "-" + file.cleanFileName);
   },
});

const fileFilter = (req, file, cb) => {
   const allowedExtensions = /jpeg|jpg|png|webp/;

   const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());

   const mimetype = allowedExtensions.test(file.mimetype);

   if (extname && mimetype) {
      return cb(null, true);
   } else {
      return cb(new Error("Format file tidak valid!, hanya mendukung JPG, JPEG, PNG, WEBP."), false);
   }
};

const upload = multer({
   storage: storage,
   limits: {
      fileSize: 10 * 1024 * 1024,
   },
   fileFilter: fileFilter,
});

module.exports = { upload };
