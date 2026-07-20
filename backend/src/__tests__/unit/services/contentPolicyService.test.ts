import { ContentPolicyService } from '../../../services/contentPolicyService';
import { ContentPolicySchema } from '../../../types/contentPolicy';
import { YouTubeMetadata } from '../../../types/youtube';

function metadata(overrides: Partial<YouTubeMetadata> = {}): YouTubeMetadata {
  return { id: 'abc123', title: 'A normal video', ...overrides };
}

describe('ContentPolicyService', () => {
  it('blocks a video with an exact blocked tag (case-insensitive)', () => {
    const policy = ContentPolicySchema.parse({ blockedTags: ['Gaming'] });
    const service = new ContentPolicyService(policy);
    const violation = service.evaluate(metadata({ tags: ['gaming', 'fun'] }));
    expect(violation).toEqual(expect.objectContaining({ reason: 'blockedTag', matched: 'Gaming' }));
  });

  it('blocks a video with an exact blocked category', () => {
    const policy = ContentPolicySchema.parse({ blockedCategories: ['Gaming'] });
    const service = new ContentPolicyService(policy);
    const violation = service.evaluate(metadata({ categories: ['Gaming'] }));
    expect(violation?.reason).toBe('blockedCategory');
  });

  it('blocks a video whose title contains a blocked term', () => {
    const policy = ContentPolicySchema.parse({ blockedTerms: ['minecraft'] });
    const service = new ContentPolicyService(policy);
    const violation = service.evaluate(metadata({ title: "Epic Minecraft Let's Play" }));
    expect(violation?.reason).toBe('blockedTerm');
  });

  it('blocks a video whose description contains a blocked term', () => {
    const policy = ContentPolicySchema.parse({ blockedTerms: ['fortnite'] });
    const service = new ContentPolicyService(policy);
    const violation = service.evaluate(metadata({ description: 'A fortnite montage' }));
    expect(violation?.reason).toBe('blockedTerm');
    expect(violation?.matched).toBe('fortnite');
  });

  it('blocks a video whose uploader contains a blocked term', () => {
    const policy = ContentPolicySchema.parse({ blockedTerms: ['gamer'] });
    const service = new ContentPolicyService(policy);
    const violation = service.evaluate(metadata({ uploader: 'ProGamer123' }));
    expect(violation?.reason).toBe('blockedTerm');
  });

  it('matches terms case-insensitively', () => {
    const policy = ContentPolicySchema.parse({ blockedTerms: ['fortnite'] });
    const service = new ContentPolicyService(policy);
    const violation = service.evaluate(metadata({ title: 'FORTNITE Battle Royale' }));
    expect(violation?.reason).toBe('blockedTerm');
  });

  it('allows content with no policy match', () => {
    const policy = ContentPolicySchema.parse({ blockedTags: ['gaming'] });
    const service = new ContentPolicyService(policy);
    expect(service.evaluate(metadata({ tags: ['music'] }))).toBeNull();
  });

  it('allows all content when policy is empty (default)', () => {
    const policy = ContentPolicySchema.parse({});
    const service = new ContentPolicyService(policy);
    expect(service.evaluate(metadata({ tags: ['gaming'], categories: ['Gaming'] }))).toBeNull();
  });

  it('does not crash when video has no tags or categories', () => {
    const policy = ContentPolicySchema.parse({ blockedTags: ['gaming'], blockedCategories: ['Gaming'] });
    const service = new ContentPolicyService(policy);
    expect(service.evaluate(metadata())).toBeNull();
  });

  it('returns the configured message in the violation', () => {
    const policy = ContentPolicySchema.parse({
      blockedTags: ['gaming'],
      message: 'This video was blocked because it appears to be gaming-related.'
    });
    const service = new ContentPolicyService(policy);
    const violation = service.evaluate(metadata({ tags: ['gaming'] }));
    expect(violation?.message).toBe('This video was blocked because it appears to be gaming-related.');
  });

  it('uses the default message when none is configured', () => {
    const policy = ContentPolicySchema.parse({ blockedTags: ['gaming'] });
    const service = new ContentPolicyService(policy);
    const violation = service.evaluate(metadata({ tags: ['gaming'] }));
    expect(violation?.message).toBe('This video was blocked by the configured content policy.');
  });
});
