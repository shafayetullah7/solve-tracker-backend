import { learningNodeCompletionMode } from '../../database/schema/learning/learning-node-completion-mode.enum.js';
import { MAX_DEPTH } from './learning-hierarchy.js';

export type OutlineNode = {
  localKey: string;
  parentLocalKey: string | null;
  title: string;
  depth: number;
};

export type MarkdownParseResult = {
  nodes: OutlineNode[];
  warnings: string[];
};

const heading = /^(#{1,32})\s+(.+?)\s*$/;

export function parseMarkdownOutline(source: string): MarkdownParseResult {
  const warnings: string[] = [];
  const nodes: OutlineNode[] = [];
  const stack: { depth: number; localKey: string }[] = [];
  let index = 0;
  for (const line of source.split(/\r?\n/)) {
    const match = heading.exec(line.trimEnd());
    if (!match) continue;
    const depth = match[1]?.length ?? 0;
    const title = (match[2] ?? '').trim();
    if (!title) {
      warnings.push('Skipped empty heading.');
      continue;
    }
    if (depth > MAX_DEPTH) {
      warnings.push(`Skipped heading beyond max depth: ${title}`);
      continue;
    }
    while (stack.length && stack[stack.length - 1]!.depth >= depth) stack.pop();
    const parentLocalKey = stack.length ? stack[stack.length - 1]!.localKey : null;
    const localKey = `n${index += 1}`;
    nodes.push({ localKey, parentLocalKey, title, depth });
    stack.push({ depth, localKey });
  }
  if (!nodes.length) warnings.push('No headings found; import needs at least one line like "# Title".');
  return { nodes, warnings };
}

export function outlineToPortable(title: string, nodes: OutlineNode[]) {
  return {
    schemaVersion: 1 as const,
    title,
    description: '',
    nodes: nodes.map((node) => ({
      localKey: node.localKey,
      parentLocalKey: node.parentLocalKey,
      title: node.title,
      required: true,
      completionMode: learningNodeCompletionMode.Structural,
      blocks: [] as [],
    })),
    mediaManifest: [],
  };
}

export function portableToMarkdown(guide: {
  title: string;
  nodes: readonly {
    localKey: string;
    parentLocalKey: string | null;
    title: string;
    blocks: readonly { type: string; payload: Record<string, unknown> }[];
  }[];
}): string {
  const byKey = new Map(guide.nodes.map((n) => [n.localKey, n]));
  const depthOf = (key: string): number => {
    let depth = 1;
    let current = byKey.get(key);
    while (current?.parentLocalKey) {
      depth += 1;
      current = byKey.get(current.parentLocalKey);
    }
    return depth;
  };
  const lines = [`# ${guide.title}`, ''];
  for (const node of guide.nodes) {
    lines.push(`${'#'.repeat(Math.min(32, depthOf(node.localKey)))} ${node.title}`);
    for (const block of node.blocks) {
      if (block.type === 'text' && typeof block.payload.body === 'string') lines.push(block.payload.body, '');
      if (block.type === 'code' && typeof block.payload.body === 'string') {
        const lang = typeof block.payload.language === 'string' ? block.payload.language : '';
        lines.push('```' + lang, block.payload.body, '```', '');
      }
    }
  }
  return lines.join('\n');
}