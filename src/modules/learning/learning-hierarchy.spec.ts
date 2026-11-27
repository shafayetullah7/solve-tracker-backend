import { describe, expect, it } from 'vitest';
import { buildHierarchy, planPlacement, HierarchyError, MAX_DEPTH, MAX_NODES, MAX_SIBLINGS } from './learning-hierarchy.js';

const node = (id: string, parentId: string | null = null, position = 0) => ({ id, parentId, position });
const fixture = [node('b', null, 1), node('c', 'a'), node('a')];
const chain = (length: number) => Array.from({ length }, (_, i) => node(String(i), i === 0 ? null : String(i - 1)));

describe('learning hierarchy', () => {
  it('accepts an empty guide', () => expect(buildHierarchy([]).preorder).toEqual([]));
  it('orders nodes by sibling position and calculates depths and heights', () => {
    const tree = buildHierarchy(fixture);
    expect(tree.preorder.map(n => n.id)).toEqual(['a', 'c', 'b']);
    expect(tree.depths.get('c')).toBe(2);
    expect(tree.heights.get('a')).toBe(2);
    expect(fixture.map(n => n.id)).toEqual(['b', 'c', 'a']);
  });
  it.each([
    [node('a'), node('a', null, 1)],
    [node('a', 'missing')],
    [node('a', 'b'), node('b', 'a')],
    [node('a', 'a')],
    [node('a', null, 1)],
    [node('a'), node('b')],
  ].map(nodes => ({ nodes })))('rejects malformed hierarchy $nodes', ({ nodes }) => {
    expect(() => buildHierarchy(nodes)).toThrow(HierarchyError);
  });
  it('enforces depth boundaries', () => {
    expect(buildHierarchy(chain(MAX_DEPTH)).preorder).toHaveLength(MAX_DEPTH);
    expect(() => buildHierarchy(chain(MAX_DEPTH + 1))).toThrow(HierarchyError);
  });
  it('enforces node and sibling limits', () => {
    expect(() => buildHierarchy(chain(MAX_NODES + 1))).toThrow('Node limit');
    const roots = Array.from({ length: MAX_SIBLINGS }, (_, i) => node(String(i), null, i));
    expect(buildHierarchy(roots).preorder).toHaveLength(MAX_SIBLINGS);
    expect(() => planPlacement(roots, null, null, null)).toThrow('Sibling limit');
    expect(() => buildHierarchy([...roots, node('extra', null, MAX_SIBLINGS)])).toThrow(HierarchyError);
  });
});

describe('learning placement', () => {
  it('inserts before a sibling or appends', () => {
    expect(planPlacement(fixture, null, null, 'b').index).toBe(1);
    expect(planPlacement(fixture, null, null, null).index).toBe(2);
  });
  it('recognizes an unchanged placement', () => {
    expect(planPlacement(fixture, 'a', null, 'b').unchanged).toBe(true);
  });
  it('plans cross-parent moves without mutating the input', () => {
    const plan = planPlacement(fixture, 'c', null, 'b');
    expect(plan.destination.map(n => n.id)).toEqual(['a', 'b']);
    expect(plan.source).toEqual([]);
    expect(plan.index).toBe(1);
    expect(plan.unchanged).toBe(false);
    expect(fixture[1]?.parentId).toBe('a');
  });
  it('rejects cycles, missing nodes and anchors outside the destination', () => {
    expect(() => planPlacement(fixture, 'a', 'c', null)).toThrow(HierarchyError);
    expect(() => planPlacement(fixture, 'a', 'a', null)).toThrow(HierarchyError);
    expect(() => planPlacement(fixture, 'missing', null, null)).toThrow(HierarchyError);
    expect(() => planPlacement(fixture, null, 'missing', null)).toThrow(HierarchyError);
    expect(() => planPlacement(fixture, null, null, 'c')).toThrow(HierarchyError);
  });
  it('rejects moves whose subtree would exceed maximum depth', () => {
    const nodes = [...chain(MAX_DEPTH - 1), node('root', null, 1), node('child', 'root')];
    expect(() => planPlacement(nodes, 'root', String(MAX_DEPTH - 2), null)).toThrow('Depth limit');
  });
});
