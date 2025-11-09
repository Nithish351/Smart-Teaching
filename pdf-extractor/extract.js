const fs = require("fs");

// Load the PDF file
const pdfBuffer = fs.readFileSync("./valid-test.pdf");

async function extractText() {
  try {
    const pdfParse = require("pdf-parse");
    
    // Case 1: Legacy API (pdf-parse as a function or .default)
    if (typeof pdfParse === "function") {
      console.log("Using legacy API (function)");
      const data = await pdfParse(pdfBuffer);
      console.log("✅ PDF text extracted successfully!\n");
      console.log(data.text);
      return;
    }
    
    if (pdfParse.default && typeof pdfParse.default === "function") {
      console.log("Using legacy API (.default)");
      const data = await pdfParse.default(pdfBuffer);
      console.log("✅ PDF text extracted successfully!\n");
      console.log(data.text);
      return;
    }
    
    // Case 2: New class-based API (PDFParse class)
    if (pdfParse.PDFParse) {
      console.log("Using new class-based API");
      const uint8Array = new Uint8Array(pdfBuffer);
      const parser = new pdfParse.PDFParse(uint8Array);
      await parser.load();
      const text = await parser.getText();
      parser.destroy();
      console.log("✅ PDF text extracted successfully!\n");
      console.log(text);
      return;
    }
    
    throw new Error("Unable to determine pdf-parse API version");
  } catch (err) {
    console.error("❌ Error extracting PDF:", err);
    process.exit(1);
  }
}

extractText();
