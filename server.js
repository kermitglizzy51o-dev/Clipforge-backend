import express from "express";
import cors from "cors";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.get("/", (req, res) => {
  res.json({ name: "ClipForge AI", status: "online" });
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/jobs", async (req, res) => {
  try {
    const { videoUrl } = req.body;

    if (!videoUrl)
      return res.status(400).json({ error: "Video URL required" });

    const { data, error } = await supabase
      .from("clip_jobs")
      .insert({
        video_url: videoUrl,
        status: "queued"
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ job: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/analyze", async (req, res) => {
  try {
    const { transcript } = req.body;

    if (!transcript)
      return res.status(400).json({ error: "Transcript required" });

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: `Find 5 interesting video moments.
Give each a title and explain why it is interesting.
Return JSON only.

Transcript:
${transcript}`
    });

    res.json({ analysis: response.output_text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("ClipForge AI online");
});
