import { z } from 'zod';

export const YtDlpResponseSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  duration: z.number().optional(),
  uploader: z.string().optional(),
  channel: z.string().optional(),
  upload_date: z.string().optional(),
  view_count: z.number().optional(),
  format: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  thumbnail: z.string().optional(),
});

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