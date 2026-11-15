# ClipForge backend starter

This is a starter API, not the finished AI clipping engine yet.

## 1. Create the database table in Supabase SQL Editor

```sql
create table if not exists public.clip_jobs (
  id uuid primary key default gen_random_uuid(),
  video_url text not null,
  status text not null default 'queued',
  created_at timestamptz not null default now()
);
```

## 2. Deploy
Upload this folder to a GitHub repository, then in Railway choose New Project → Deploy from GitHub Repo.

## 3. Railway Variables
Add:
- `SUPABASE_URL` = your project URL
- `SUPABASE_SERVICE_ROLE_KEY` = your Supabase service role/secret key (server only; never put in website)
- `FRONTEND_URL` = your Netlify website URL

Railway automatically provides `PORT`.

## 4. Test
Open the Railway public domain URL. It should show `ClipForge API` and `status: online`.
`/health` should return `{"ok":true}`.

Important: this starter only saves job requests. Actual downloading, transcription, clip selection, subtitles and rendering need a separate worker and safe video-source support.
