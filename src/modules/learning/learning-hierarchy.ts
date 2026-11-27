export const MAX_NODES = 2000;
export const MAX_DEPTH = 32;
export const MAX_SIBLINGS = 500;

export type HierarchyNode = { id: string; parentId: string | null; position: number };

export class HierarchyError extends Error {}

export function buildHierarchy<T extends HierarchyNode>(nodes: readonly T[]) {
  if (nodes.length > MAX_NODES) throw new HierarchyError('Node limit exceeded.');
  const byId = new Map(nodes.map((node) => [node.id, node]));
  if (byId.size !== nodes.length) throw new HierarchyError('Duplicate node.');
  const children = new Map<string | null, T[]>();
  for (const node of nodes) {
    if (node.parentId !== null && !byId.has(node.parentId))
      throw new HierarchyError('Missing parent.');
    const siblings = children.get(node.parentId) ?? [];
    siblings.push(node);
    children.set(node.parentId, siblings);
  }
  for (const siblings of children.values()) {
    siblings.sort((a, b) => a.position - b.position);
    if (siblings.length > MAX_SIBLINGS || siblings.some((node, index) => node.position !== index))
      throw new HierarchyError('Invalid sibling ordering.');
  }
  const preorder: T[] = [];
  const depths = new Map<string, number>();
  const heights = new Map<string, number>();
  function visit(node: T, depth: number): number {
    if (depth > MAX_DEPTH || depths.has(node.id)) throw new HierarchyError('Invalid hierarchy.');
    depths.set(node.id, depth);
    preorder.push(node);
    let height = 1;
    for (const child of children.get(node.id) ?? []) height = Math.max(height, 1 + visit(child, depth + 1));
    heights.set(node.id, height);
    return height;
  }
  for (const root of children.get(null) ?? []) visit(root, 1);
  if (preorder.length !== nodes.length) throw new HierarchyError('Unreachable nodes or cycle.');
  return { byId, children, preorder, depths, heights };
}

export function planPlacement<T extends HierarchyNode>(
  nodes: readonly T[], movingId: string | null, parentId: string | null, beforeNodeId: string | null,
) {
  const tree = buildHierarchy(nodes);
  const moving = movingId === null ? undefined : tree.byId.get(movingId);
  if (movingId !== null && !moving) throw new HierarchyError('Missing moving node.');
  if (!moving && nodes.length >= MAX_NODES) throw new HierarchyError('Node limit exceeded.');
  if (parentId !== null && !tree.byId.has(parentId)) throw new HierarchyError('Missing destination parent.');
  let ancestor = parentId;
  while (ancestor !== null) {
    if (ancestor === movingId) throw new HierarchyError('Placement would create a cycle.');
    ancestor = tree.byId.get(ancestor)?.parentId ?? null;
  }
  const depth = parentId === null ? 0 : tree.depths.get(parentId)!;
  const height = moving ? tree.heights.get(moving.id)! : 1;
  if (depth + height > MAX_DEPTH) throw new HierarchyError('Depth limit exceeded.');
  const destination = (tree.children.get(parentId) ?? []).filter((node) => node.id !== movingId);
  if (destination.length >= MAX_SIBLINGS) throw new HierarchyError('Sibling limit exceeded.');
  const index = beforeNodeId === null ? destination.length : destination.findIndex((node) => node.id === beforeNodeId);
  if (index < 0) throw new HierarchyError('Invalid destination anchor.');
  return { destination, index, source: moving ? (tree.children.get(moving.parentId) ?? []).filter((node) => node.id !== movingId) : [], unchanged: moving !== undefined && moving.parentId === parentId && moving.position === index };
}
