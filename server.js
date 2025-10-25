// ===================== StudySphere AI (Gemini Backend - Single File) =====================

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// ---------- Gemini Setup ----------
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: process.env.MODEL || "gemini-1.5-flash" });

// ---------- AI Helper ----------
async function generateAIResponse(prompt) {
  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Gemini Error:", error);
    return "⚠️ Sorry, I couldn’t process your request right now.";
  }
}

// ---------- ROUTES ----------

// ✅ Home route
app.get("/", (req, res) => {
  res.send("✅ StudySphere AI Backend (Gemini Version) Running");
});

// 🧠 Generate Notes
app.post("/api/notes", async (req, res) => {
  const { subject, chapter } = req.body;
  const prompt = `Create detailed, simple, and exam-focused notes for ${subject}, chapter: "${chapter}". 
Include key points, examples, and a short summary.`;
  const notes = await generateAIResponse(prompt);
  res.json({ notes });
});

// 💬 Clear Doubt
app.post("/api/doubt", async (req, res) => {
  const { question, subject } = req.body;
  const prompt = `You are a helpful tutor for ${subject}. Explain this in clear steps: ${question}`;
  const answer = await generateAIResponse(prompt);
  res.json({ answer });
});

// 🧩 Mock Test
app.post("/api/mocktest", async (req, res) => {
  const { subject, chapter } = req.body;
  const prompt = `Create a 10-question mock test for ${subject}, chapter "${chapter}". 
Include multiple-choice, short answer, and long answer questions with answers at the end.`;
  const test = await generateAIResponse(prompt);
  res.json({ test });
});

// 📄 Sample Paper
app.post("/api/samplepaper", async (req, res) => {
  const { subject } = req.body;
  const prompt = `Generate a 50-mark model exam paper for ${subject} including short, long, and MCQs with marks.`;
  const paper = await generateAIResponse(prompt);
  res.json({ paper });
});

// 📊 Analyze Performance
app.post("/api/performance", async (req, res) => {
  const { answers, subject } = req.body;
  const prompt = `Analyze these answers for ${subject}: ${JSON.stringify(answers)}. 
Provide strengths, mistakes, and improvement tips.`;
  const feedback = await generateAIResponse(prompt);
  res.json({ feedback });
});

// ---------- Start Server ----------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
