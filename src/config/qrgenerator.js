const QRCode = require("qrcode");
const { createCanvas, loadImage } = require("canvas");
const { capitalEachWord } = require("../helper/textModifer");

const BASE_URL = process.env.BASE_URL;

const generateQR = async (barang, res) => {
   const urlBarang = `${BASE_URL}/admin/item-detail/${barang.id_barang}`;

   const qr = await QRCode.toDataURL(urlBarang, {
      width: 400,
      margin: 1,
   });

   const width = 709; // 6cm @ 300DPI
   const height = 472; // 4cm @ 300DPI
   const canvas = createCanvas(width, height);
   const ctx = canvas.getContext("2d");
   const qrImage = await loadImage(qr);

   ctx.fillStyle = "#ffffff";
   ctx.fillRect(0, 0, width, height);

   ctx.strokeStyle = "#585858";
   ctx.lineWidth = 5;
   ctx.strokeRect(7.5, 7.5, width - 15, height - 15);

   const qrSize = 340;
   const qrX = 35;
   const qrY = 45;
   ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

   ctx.beginPath();
   ctx.moveTo(395, 40);
   ctx.lineTo(395, 410);
   ctx.strokeStyle = "#dddddd";
   ctx.lineWidth = 2;
   ctx.stroke();

   const drawDynamicText = (text, x, y, maxWidth, maxLines, defaultFontSize, minFontSize, isBold, color, align = "left") => {
      let fontStyle = isBold ? "bold" : "normal";
      let fontSize = defaultFontSize;
      let lineHeight = fontSize * 1.2;

      while (fontSize >= minFontSize) {
         ctx.font = `${fontStyle} ${fontSize}px Helvetica`;
         const words = String(text || "-").split(" ");
         let testLines = [];
         let line = "";
         let needShrink = false;

         for (let i = 0; i < words.length; i++) {
            if (ctx.measureText(words[i]).width > maxWidth) {
               needShrink = true;
            }

            let testLine = line + words[i] + " ";
            if (ctx.measureText(testLine).width > maxWidth && i > 0) {
               testLines.push(line.trim());
               line = words[i] + " ";
            } else {
               line = testLine;
            }
         }
         testLines.push(line.trim());

         if (testLines.length <= maxLines && !needShrink) {
            break;
         }

         fontSize--;
      }

      ctx.font = `${fontStyle} ${fontSize}px Helvetica`;
      lineHeight = fontSize * 1.2;

      let finalLines = [];
      let currentLine = "";
      const rawWords = String(text || "-").split(" ");

      for (let i = 0; i < rawWords.length; i++) {
         let word = rawWords[i];

         if (ctx.measureText(word).width > maxWidth) {
            for (let char of word) {
               let testLine = currentLine + char;
               if (ctx.measureText(testLine).width > maxWidth) {
                  finalLines.push(currentLine.trim());
                  currentLine = char;
               } else {
                  currentLine += char;
               }
            }
            currentLine += " ";
         } else {
            let testLine = currentLine + word + " ";
            if (ctx.measureText(testLine).width > maxWidth && currentLine !== "") {
               finalLines.push(currentLine.trim());
               currentLine = word + " ";
            } else {
               currentLine = testLine;
            }
         }
      }
      if (currentLine.trim() !== "") {
         finalLines.push(currentLine.trim());
      }

      if (finalLines.length > maxLines) {
         finalLines = finalLines.slice(0, maxLines);
         let lastLine = finalLines[maxLines - 1];

         while (ctx.measureText(lastLine + "...").width > maxWidth && lastLine.length > 0) {
            lastLine = lastLine.slice(0, -1);
         }
         finalLines[maxLines - 1] = lastLine + "...";
      }

      ctx.fillStyle = color;
      ctx.textAlign = align;
      let currentY = y;

      for (let i = 0; i < finalLines.length; i++) {
         ctx.fillText(finalLines[i], x, currentY);
         currentY += lineHeight;
      }

      return currentY;
   };

   const textX = 415;
   const maxWidth = 265;
   let nextY = 65;

   nextY = drawDynamicText(barang.nama_barang.toUpperCase(), textX, nextY, maxWidth, 3, 32, 28, true, "#000000");

   nextY += 15;

   const drawRow = (label, value, startY) => {
      ctx.fillStyle = "#7f8c8d";
      ctx.font = "bold 14px Helvetica";
      ctx.textAlign = "left";
      ctx.fillText(label, textX, startY);

      let valueY = startY + 24;

      let returnY = drawDynamicText(value, textX, valueY, maxWidth, 2, 20, 18, false, "#333333");

      return returnY + 20;
   };

   nextY = drawRow("RUANGAN", capitalEachWord(barang.ruangan), nextY);
   nextY = drawRow("KATEGORI", capitalEachWord(barang.kategori), nextY);
   nextY = drawRow("MEREK", capitalEachWord(barang.merek), nextY);
   nextY = drawRow("JUMLAH ASET FISIK", `${barang.jumlah || 0} ${capitalEachWord(barang.satuan) || "Barang"}`, nextY);

   drawDynamicText(`ID: ${barang.id_barang}`, width / 2, 445, width - 60, 2, 13, 9, false, "#bdc3c7", "center");

   return canvas.toBuffer("image/png");
};

module.exports = generateQR;
