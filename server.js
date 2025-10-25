import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import notesRoutes from "./routes/notesRoutes.js";
import doubtRoutes from "./routes/doubtRoutes.js";
import mockTestRoutes from "./routes/mockTestRoutes.js";
import samplePaperRoutes from "./routes/samplePaperRoutes.js";
import performanceRoutes from "./routes/performanceRoutes.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/notes", notesRoutes);
app.use("/api/doubt", doubtRoutes);
app.use("/api/mocktest", mockTestRoutes);
app.use("/api/samplepaper", samplePaperRoutes);
app.use("/api/performance", performanceRoutes);

app.get("/", (req, res) => {
  res.send("✅ StudySphere AI Backend Running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
