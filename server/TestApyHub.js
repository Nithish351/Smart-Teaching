const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");

// ✅ Use your ApyHub API key here
const API_KEY = "APY0R1AqhXE80s9hXE9zALKjdub954ZMOhHQkjuBpX6QnzfJc2hAIXZvrgRyoBcqmAp9V5gpgK";

// ✅ Give the correct path to your PDF
const pdfFilePath = "./test.pdf";

async function testApyHub() {
  try {
    if (!fs.existsSync(pdfFilePath)) {
      console.error(`❌ PDF file not found at: ${pdfFilePath}`);
      console.error("Please place a test PDF file named 'test.pdf' in the server directory.");
      process.exit(1);
    }

    const formData = new FormData();
    formData.append("file", fs.createReadStream(pdfFilePath));

    // ✅ Updated API endpoint (as of 2025)
    const response = await axios.post(
      "https://api.apyhub.com/extract/text/pdf",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          "apy-token": API_KEY,
        },
      }
    );

    console.log("✅ Extraction successful!");
    console.log("📄 Response object:", response.data);

    const text =
      typeof response.data === "string"
        ? response.data
        : response.data?.data || response.data?.text || "";

    console.log("📝 Extracted text (first 500 chars):");
    console.log(String(text).substring(0, 500));
  } catch (err) {
    console.error("❌ Extraction failed:");
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Data:", err.response.data);
    } else {
      console.error(err.message);
    }
  }
}

testApyHub();
