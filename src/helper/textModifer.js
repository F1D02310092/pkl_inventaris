function capitalEachWord(text) {
   if (!text) {
      return "";
   }

   text = String(text);

   return text
      .toLowerCase()
      .split(" ")
      .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : ""))
      .join(" ");
}

module.exports = {
   capitalEachWord,
};
