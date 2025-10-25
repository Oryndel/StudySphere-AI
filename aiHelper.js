import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

export const generateAIResponse = async (prompt) => {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: process.env.AI_MODEL,
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.AI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("AI Error:", error.response?.data || error.message);
    return "Sorry, I couldn’t process your request.";
  }
};
