// server.js
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.FREEPIK_API_KEY;

// for resolving absolute paths (works on Render + GitHub)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ serve your index.html directly (no folder needed)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ✅ Freepik API proxy
app.get("/api/search", async (req, res) => {
  try {
    const query = req.query.q || "";
    const url = `https://api.freepik.com/v1/resources?query=${encodeURIComponent(query)}&per_page=10`;

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "x-freepik-api-key": API_KEY,
      },
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error in /api/search:", error);
    res.status(500).json({ error: "Server error", message: error.message });
  }
});

// ✅ fallback for all other routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
