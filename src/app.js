if (process.env.NODE_ENV !== "production") {
   require("dotenv").config();
}

const express = require("express");
const app = express();
const PORT = process.env.PORT;

app.get("/health", (req, res) => {
   return res.status(200).json({
      message: "Connected succesfully",
   });
});

app.listen(PORT, () => {
   console.log(`Listening on port: ${PORT}`);
});
