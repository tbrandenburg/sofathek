import * as fs from 'fs';
import * as path from 'path';
import { ContentPolicy, ContentPolicySchema, SettingsFileSchema } from '../types/contentPolicy';

const DEFAULT_POLICY: ContentPolicy = ContentPolicySchema.parse({});

function resolveConfigDir(): string {
  return process.env.SOFATHEK_CONFIG_DIR || process.cwd();
}

function loadSettingsFile(): unknown {
  const settingsPath = path.join(resolveConfigDir(), '.sofathek', 'settings.json');

  if (!fs.existsSync(settingsPath)) {
    return {};
  }

  let raw: string;
  try {
    raw = fs.readFileSync(settingsPath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read content policy settings at ${settingsPath}: ${(error as Error).message}`);
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in content policy settings at ${settingsPath}: ${(error as Error).message}`);
  }
}

function loadContentPolicy(): ContentPolicy {
  const rawSettings = loadSettingsFile();
  const result = SettingsFileSchema.safeParse(rawSettings);

  if (!result.success) {
    throw new Error(`Invalid content policy settings: ${result.error.message}`);
  }

  return result.data.contentPolicy ?? DEFAULT_POLICY;
}

export const contentPolicy: ContentPolicy = loadContentPolicy();
