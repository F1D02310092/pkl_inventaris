function capitalEachWord(text) {
   if (!text) {
      return "";
   }

   return text
      .toLowerCase()
      .split(" ")
      .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : ""))
      .join(" ");
}

module.exports = {
   capitalEachWord,
};
