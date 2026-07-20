import { ContentPolicy, ContentPolicyViolation } from '../types/contentPolicy';
import { YouTubeMetadata } from '../types/youtube';

export class ContentPolicyService {
  constructor(private readonly policy: ContentPolicy) {}

  evaluate(metadata: YouTubeMetadata): ContentPolicyViolation | null {
    const { blockedTags, blockedCategories, blockedTerms, message } = this.policy;

    const tags = (metadata.tags ?? []).map((t) => t.toLowerCase());
    const categories = (metadata.categories ?? []).map((c) => c.toLowerCase());

    for (const blockedTag of blockedTags) {
      if (tags.includes(blockedTag.toLowerCase())) {
        return { reason: 'blockedTag', matched: blockedTag, message };
      }
    }

    for (const blockedCategory of blockedCategories) {
      if (categories.includes(blockedCategory.toLowerCase())) {
        return { reason: 'blockedCategory', matched: blockedCategory, message };
      }
    }

    if (blockedTerms.length > 0) {
      const haystack = [
        metadata.title,
        metadata.description,
        metadata.uploader,
        ...(metadata.tags ?? []),
        ...(metadata.categories ?? []),
      ]
        .filter((value): value is string => typeof value === 'string')
        .join('\n')
        .toLowerCase();

      for (const term of blockedTerms) {
        if (haystack.includes(term.toLowerCase())) {
          return { reason: 'blockedTerm', matched: term, message };
        }
      }
    }

    return null;
  }
}
