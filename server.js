import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json({ limit: "1mb" }));

const port = process.env.PORT || 3000;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

app.get("/", (_req, res) => res.json({ name: "ClipForge API", status: "online" }));
app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/api/jobs", async (req, res) => {
  const { videoUrl } = req.body || {};
  if (!videoUrl || typeof videoUrl !== "string") {
    return res.status(400).json({ error: "Send a videoUrl string." });
  }
  try {
    const parsed = new URL(videoUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Invalid protocol");
  } catch {
    return res.status(400).json({ error: "Please send a valid http or https video URL." });
  }

  // This endpoint is a safe starter: it records a request, but does not download/edit videos yet.
  if (!supabaseUrl || !supabaseKey) {
    return res.status(503).json({ error: "Backend setup incomplete. Add Supabase environment variables in Railway." });
  }
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase.from("clip_jobs").insert({
    video_url: videoUrl,
    status: "queued"
  }).select("id,status,created_at").single();

  if (error) return res.status(500).json({ error: "Could not save job", detail: error.message });
  res.status(202).json({ job: data, message: "Job saved. Video processing worker is not connected yet." });
});

app.listen(port, () => console.log(`ClipForge API listening on ${port}`));
