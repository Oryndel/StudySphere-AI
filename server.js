import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import compression from "compression";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(compression()); // Gzip compression for faster responses

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) console.warn("⚠️ GEMINI_API_KEY is not set!");

app.get("/", (_, res) => res.send("✅ Gemini AI backend is running."));

app.post("/api/chat", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "message is required" });

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const body = { contents: [{ parts: [{ text: message }] }] };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Gemini API error:", text);
      return res.status(502).json({ error: "Upstream API error", details: text });
    }

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.[0]?.text || "";
    return res.json({ reply });

  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
