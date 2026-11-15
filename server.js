import express from "express";
import cors from "cors";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import Replicate from "replicate";
const app = express();
app.use(cors({
  origin: true
}));
app.use(express.json({ limit: "5mb" }));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
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

    if (!videoUrl) {
      return res.status(400).json({ error: "Video URL required" });
    }

    const { data, error } = await supabase
      .from("clip_jobs")
      .insert({
        video_url: videoUrl,
        status: "queued"
      })
      .select()
      .single();

    if (error) {
      console.error("SUPABASE INSERT ERROR:", error);
      throw error;
    }

    res.json({ job: data });
  } catch (err) {
    console.error("JOB ERROR:", err);
    console.error("CAUSE:", err.cause);
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
async function processJob(job) {
  try {
    console.log("Processing job:", job.id);

    await supabase
      .from("clip_jobs")
      .update({ status: "processing" })
      .eq("id", job.id);

    const output = await replicate.run(
       "openai/whisper:8099696689d249cf8b122d833c36ac3f75505c666a395ca40ef26f68e7d3d16e",
      {
        input: {
          audio: job.video_url
        }
      }
    );

    await supabase
      .from("clip_jobs")
      .update({
        status: "completed",
        result: output
      })
      .eq("id", job.id);

    console.log("Job completed:", job.id);
  } catch (err) {
    console.error("Worker error:", err);

    await supabase
      .from("clip_jobs")
      .update({ status: "failed" })
      .eq("id", job.id);
  }
}

async function startWorker() {
  console.log("ClipForge worker online");

  setInterval(async () => {
    const { data: jobs } = await supabase
      .from("clip_jobs")
      .select("*")
      .eq("status", "queued")
      .limit(1);

    if (jobs && jobs.length > 0) {
      await processJob(jobs[0]);
    }
  }, 10000);
}

startWorker();
app.listen(process.env.PORT || 3000, () => {
  console.log("ClipForge AI online");
});
