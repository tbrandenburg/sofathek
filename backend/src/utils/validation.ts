import { z } from 'zod';

export const YtDlpResponseSchema = z.object({
  id: z.string().nullish(),
  title: z.string().nullish(),
  description: z.string().nullish(),
  duration: z.number().nullish(),
  uploader: z.string().nullish(),
  uploader_id: z.string().nullish(),
  channel: z.string().nullish(),
  channel_id: z.string().nullish(),
  channel_url: z.string().nullish(),
  channel_follower_count: z.number().nullish(),
  channel_is_verified: z.boolean().nullish(),
  upload_date: z.string().nullish(),
  timestamp: z.number().nullish(),
  release_year: z.number().nullish(),
  width: z.number().nullish(),
  height: z.number().nullish(),
  resolution: z.string().nullish(),
  fps: z.number().nullish(),
  aspect_ratio: z.number().nullish(),
  dynamic_range: z.string().nullish(),
  vcodec: z.string().nullish(),
  acodec: z.string().nullish(),
  vbr: z.number().nullish(),
  abr: z.number().nullish(),
  tbr: z.number().nullish(),
  asr: z.number().nullish(),
  audio_channels: z.number().nullish(),
  filesize_approx: z.number().nullish(),
  view_count: z.number().nullish(),
  like_count: z.number().nullish(),
  comment_count: z.number().nullish(),
  categories: z.array(z.string()).nullish(),
  tags: z.array(z.string()).nullish(),
  age_limit: z.number().nullish(),
  language: z.string().nullish(),
  availability: z.string().nullish(),
  is_live: z.boolean().nullish(),
  was_live: z.boolean().nullish(),
  live_status: z.string().nullish(),
  playable_in_embed: z.boolean().nullish(),
  thumbnail: z.string().nullish(),
  webpage_url: z.string().nullish(),
  chapters: z.array(z.object({
    title: z.string(),
    start_time: z.number(),
    end_time: z.number()
  })).nullish(),
  heatmap: z.array(z.object({
    start_time: z.number(),
    end_time: z.number(),
    value: z.number()
  })).nullish(),
}).strip();

export type YtDlpResponse = z.infer<typeof YtDlpResponseSchema>;

export function validateYtDlpResponse(raw: unknown): YtDlpResponse {
  const result = YtDlpResponseSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid yt-dlp response: ${result.error.message}`);
  }
  return result.data;
}

export const FsStatsSchema = z.object({
  size: z.number(),
  mtime: z.date(),
  isDirectory: z.function().returns(z.boolean()),
  isFile: z.function().returns(z.boolean()),
});

export type FsStats = z.infer<typeof FsStatsSchema>;