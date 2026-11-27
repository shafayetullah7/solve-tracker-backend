import { describe, expect, it } from 'vitest';
import { outlineToPortable, parseMarkdownOutline } from './learning-markdown-outline.js';
import { portableGuideSchema } from './schemas/learning-portable.schema.js';

describe('parseMarkdownOutline', () => {
  it('parses nested headings', () => {
    const result = parseMarkdownOutline('# Guide\n## Section\n### Step');
    expect(result.nodes).toHaveLength(3);
    expect(result.nodes[1]?.parentLocalKey).toBe(result.nodes[0]?.localKey);
    const portable = portableGuideSchema.parse(outlineToPortable('Guide', result.nodes));
    expect(portable.nodes).toHaveLength(3);
  });
});