// testGemini.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Load environment variables
dotenv.config({ path: path.join(__dirname, ".env") });

// ✅ Your Gemini API key (fallback optional)
const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY || "AIzaSyBhhWoggJV_Rk9h7iyrBgE5j_iWeU98fD8";

// ✅ Initialize Gemini client
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function testGemini() {
  try {
    // ⚡ Updated model name (2025)
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest", // 👈 this fixes the 404
    });

    const prompt = "Generate a short 2-question quiz on photosynthesis.";

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log("✅ Gemini working successfully!");
    console.log("🧠 Response:\n", text);
  } catch (err) {
    console.error("❌ Gemini API failed:");
    console.error(err.message || err);
  }
}

testGemini();
