import { z } from 'zod';

/**
 * Schema for `.sofathek/settings.json` `contentPolicy` section.
 * All fields optional; a missing settings file or missing contentPolicy
 * section is treated as an empty/default (non-blocking) policy.
 */
export const ContentPolicySchema = z.object({
  blockedTags: z.array(z.string()).default([]),
  blockedCategories: z.array(z.string()).default([]),
  blockedTerms: z.array(z.string()).default([]),
  message: z.string().default('This video was blocked by the configured content policy.'),
}).strict();

export const SettingsFileSchema = z.object({
  contentPolicy: ContentPolicySchema.optional(),
}).passthrough();

export type ContentPolicy = z.infer<typeof ContentPolicySchema>;

export interface ContentPolicyViolation {
  /** Which policy rule was violated */
  reason: 'blockedTag' | 'blockedCategory' | 'blockedTerm';
  /** The specific matched value */
  matched: string;
  /** User-facing message from settings */
  message: string;
}
