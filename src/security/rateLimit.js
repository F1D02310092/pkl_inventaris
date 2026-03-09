const rateLimit = require("express-rate-limit");

const loginLimiter = rateLimit({
   windowMs: 15 * 60 * 1000,
   max: 5,
   message: "Terlalu banyak percobaan login, silakan coba lagi setelah 15 menit.",
   standardHeaders: true,
   legacyHeaders: false,
});

module.exports = { loginLimiter };
