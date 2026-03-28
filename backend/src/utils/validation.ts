import { z } from 'zod';

export const YtDlpResponseSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  duration: z.number().optional(),
  uploader: z.string().optional(),
  uploader_id: z.string().optional(),
  channel: z.string().optional(),
  channel_id: z.string().optional(),
  channel_url: z.string().optional(),
  channel_follower_count: z.number().optional(),
  channel_is_verified: z.boolean().optional(),
  upload_date: z.string().optional(),
  timestamp: z.number().optional(),
  release_year: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  resolution: z.string().optional(),
  fps: z.number().optional(),
  aspect_ratio: z.number().optional(),
  dynamic_range: z.string().optional(),
  vcodec: z.string().optional(),
  acodec: z.string().optional(),
  vbr: z.number().optional(),
  abr: z.number().optional(),
  tbr: z.number().optional(),
  asr: z.number().optional(),
  audio_channels: z.number().optional(),
  filesize_approx: z.number().optional(),
  view_count: z.number().optional(),
  like_count: z.number().optional(),
  comment_count: z.number().optional(),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  age_limit: z.number().optional(),
  language: z.string().optional(),
  availability: z.string().optional(),
  is_live: z.boolean().optional(),
  was_live: z.boolean().optional(),
  live_status: z.string().optional(),
  playable_in_embed: z.boolean().optional(),
  thumbnail: z.string().optional(),
  webpage_url: z.string().optional(),
  chapters: z.array(z.object({
    title: z.string(),
    start_time: z.number(),
    end_time: z.number()
  })).optional(),
  heatmap: z.array(z.object({
    start_time: z.number(),
    end_time: z.number(),
    value: z.number()
  })).optional(),
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