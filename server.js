// server.js
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.warn("⚠️ GEMINI_API_KEY is not set in .env");
}

app.get("/", (req, res) => {
  res.send("✅ CortexLuma AI backend running.");
});

// Chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "message is required" });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const body = { contents: [{ parts: [{ text: message }] }] };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({ error: "Upstream API error", status: response.status, details: text });
    }

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return res.json({ reply, raw: data });
  } catch (err) {
    console.error("Chat Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Image generation endpoint
app.post("/api/image", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "prompt is required" });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-image:generateImage?key=${GEMINI_API_KEY}`;
    const body = { prompt, imageConfig: { height: 512, width: 512 } };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({ error: "Upstream API error", status: response.status, details: text });
    }

    const data = await response.json();
    const imageUrl = data?.candidates?.[0]?.imageUrl || null;
    return res.json({ url: imageUrl, raw: data });
  } catch (err) {
    console.error("Image Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
