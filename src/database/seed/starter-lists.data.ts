/**
 * Curated starter lists for the @starter house account (DISCOVER).
 * Educational curation only; not affiliated with judge platforms.
 * Topic `name` values normalize via normalizeTopicName (see DISCOVER_E0_DECISIONS.md).
 */

export type StarterListProblem = {
  title: string;
  url: string;
  difficulty?: string;
  rating?: number;
  platformProblemId?: string;
};

export type StarterListTopic = {
  name: string;
  description: string;
  problems: StarterListProblem[];
};

function lc(slug: string, title: string, difficulty: string): StarterListProblem {
  return {
    title,
    url: `https://leetcode.com/problems/${slug}/`,
    difficulty,
    platformProblemId: slug,
  };
}

/** Fifteen problems per topic, roughly easy → hard. */
export const STARTER_LISTS: StarterListTopic[] = [
  {
    name: 'Arrays & Hashing',
    description: 'Core patterns for arrays, hash maps, and sets.',
    problems: [
      lc('two-sum', 'Two Sum', 'Easy'),
      lc('contains-duplicate', 'Contains Duplicate', 'Easy'),
      lc('valid-anagram', 'Valid Anagram', 'Easy'),
      lc('group-anagrams', 'Group Anagrams', 'Medium'),
      lc('top-k-frequent-elements', 'Top K Frequent Elements', 'Medium'),
      lc('product-of-array-except-self', 'Product of Array Except Self', 'Medium'),
      lc('valid-sudoku', 'Valid Sudoku', 'Medium'),
      lc('encode-and-decode-strings', 'Encode and Decode Strings', 'Medium'),
      lc('longest-consecutive-sequence', 'Longest Consecutive Sequence', 'Medium'),
      lc('intersection-of-two-arrays-ii', 'Intersection of Two Arrays II', 'Easy'),
      lc('happy-number', 'Happy Number', 'Easy'),
      lc('isomorphic-strings', 'Isomorphic Strings', 'Easy'),
      lc('majority-element', 'Majority Element', 'Easy'),
      lc('missing-number', 'Missing Number', 'Easy'),
      lc('set-matrix-zeroes', 'Set Matrix Zeroes', 'Medium'),
    ],
  },
  {
    name: 'Two Pointers',
    description: 'Sliding window and opposite-end pointers.',
    problems: [
      lc('valid-palindrome', 'Valid Palindrome', 'Easy'),
      lc('two-sum-ii-input-array-is-sorted', 'Two Sum II', 'Medium'),
      lc('3sum', '3Sum', 'Medium'),
      lc('container-with-most-water', 'Container With Most Water', 'Medium'),
      lc('trapping-rain-water', 'Trapping Rain Water', 'Hard'),
      lc('remove-duplicates-from-sorted-array', 'Remove Duplicates from Sorted Array', 'Easy'),
      lc('move-zeroes', 'Move Zeroes', 'Easy'),
      lc('sort-colors', 'Sort Colors', 'Medium'),
      lc('squares-of-a-sorted-array', 'Squares of a Sorted Array', 'Easy'),
      lc('3sum-closest', '3Sum Closest', 'Medium'),
      lc('valid-palindrome-ii', 'Valid Palindrome II', 'Easy'),
      lc('partition-labels', 'Partition Labels', 'Medium'),
      lc('longest-mountain-in-array', 'Longest Mountain in Array', 'Medium'),
      lc('remove-nth-node-from-end-of-list', 'Remove Nth Node From End of List', 'Medium'),
      lc('rotate-array', 'Rotate Array', 'Medium'),
    ],
  },
  {
    name: 'Binary Search',
    description: 'Binary search on arrays and answer spaces.',
    problems: [
      lc('binary-search', 'Binary Search', 'Easy'),
      lc('search-insert-position', 'Search Insert Position', 'Easy'),
      lc('find-minimum-in-rotated-sorted-array', 'Find Minimum in Rotated Sorted Array', 'Medium'),
      lc(
        'search-in-rotated-sorted-array',
        'Search in Rotated Sorted Array',
        'Medium',
      ),
      lc(
        'find-first-and-last-position-of-element-in-sorted-array',
        'Find First and Last Position of Element in Sorted Array',
        'Medium',
      ),
      lc('search-a-2d-matrix', 'Search a 2D Matrix', 'Medium'),
      lc('koko-eating-bananas', 'Koko Eating Bananas', 'Medium'),
      lc('find-peak-element', 'Find Peak Element', 'Medium'),
      lc('time-based-key-value-store', 'Time Based Key-Value Store', 'Medium'),
      lc('median-of-two-sorted-arrays', 'Median of Two Sorted Arrays', 'Hard'),
      lc('split-array-largest-sum', 'Split Array Largest Sum', 'Hard'),
      lc('find-k-closest-elements', 'Find K Closest Elements', 'Medium'),
      lc('single-element-in-a-sorted-array', 'Single Element in a Sorted Array', 'Medium'),
      lc(
        'capacity-to-ship-packages-within-d-days',
        'Capacity To Ship Packages Within D Days',
        'Medium',
      ),
      lc('minimized-maximum-of-products-distributed-to-any-store', 'Minimized Maximum of Products', 'Medium'),
    ],
  },
  {
    name: 'Trees',
    description: 'Traversals, BST properties, and tree construction.',
    problems: [
      lc('invert-binary-tree', 'Invert Binary Tree', 'Easy'),
      lc('maximum-depth-of-binary-tree', 'Maximum Depth of Binary Tree', 'Easy'),
      lc('diameter-of-binary-tree', 'Diameter of Binary Tree', 'Easy'),
      lc('balanced-binary-tree', 'Balanced Binary Tree', 'Easy'),
      lc('same-tree', 'Same Tree', 'Easy'),
      lc('subtree-of-another-tree', 'Subtree of Another Tree', 'Easy'),
      lc(
        'lowest-common-ancestor-of-a-binary-search-tree',
        'Lowest Common Ancestor of a BST',
        'Medium',
      ),
      lc('binary-tree-level-order-traversal', 'Binary Tree Level Order Traversal', 'Medium'),
      lc('binary-tree-right-side-view', 'Binary Tree Right Side View', 'Medium'),
      lc('count-good-nodes-in-binary-tree', 'Count Good Nodes in Binary Tree', 'Medium'),
      lc('validate-binary-search-tree', 'Validate Binary Search Tree', 'Medium'),
      lc('kth-smallest-element-in-a-bst', 'Kth Smallest Element in a BST', 'Medium'),
      lc(
        'construct-binary-tree-from-preorder-and-inorder-traversal',
        'Construct Binary Tree from Preorder and Inorder',
        'Medium',
      ),
      lc('binary-tree-maximum-path-sum', 'Binary Tree Maximum Path Sum', 'Hard'),
      lc(
        'serialize-and-deserialize-binary-tree',
        'Serialize and Deserialize Binary Tree',
        'Hard',
      ),
    ],
  },
  {
    name: 'Graphs',
    description: 'BFS, DFS, and classic graph templates.',
    problems: [
      lc('number-of-islands', 'Number of Islands', 'Medium'),
      lc('clone-graph', 'Clone Graph', 'Medium'),
      lc('max-area-of-island', 'Max Area of Island', 'Medium'),
      lc('pacific-atlantic-water-flow', 'Pacific Atlantic Water Flow', 'Medium'),
      lc('surrounded-regions', 'Surrounded Regions', 'Medium'),
      lc('rotting-oranges', 'Rotting Oranges', 'Medium'),
      lc('walls-and-gates', 'Walls and Gates', 'Medium'),
      lc('course-schedule', 'Course Schedule', 'Medium'),
      lc('course-schedule-ii', 'Course Schedule II', 'Medium'),
      lc('redundant-connection', 'Redundant Connection', 'Medium'),
      lc('graph-valid-tree', 'Graph Valid Tree', 'Medium'),
      lc(
        'number-of-connected-components-in-an-undirected-graph',
        'Number of Connected Components',
        'Medium',
      ),
      lc('word-search', 'Word Search', 'Medium'),
      lc('number-of-provinces', 'Number of Provinces', 'Medium'),
      lc('min-cost-to-connect-all-points', 'Min Cost to Connect All Points', 'Medium'),
    ],
  },
  {
    name: 'Dynamic Programming',
    description: '1D and 2D DP staples for interviews.',
    problems: [
      lc('climbing-stairs', 'Climbing Stairs', 'Easy'),
      lc('house-robber', 'House Robber', 'Medium'),
      lc('house-robber-ii', 'House Robber II', 'Medium'),
      lc('longest-palindromic-substring', 'Longest Palindromic Substring', 'Medium'),
      lc('palindromic-substrings', 'Palindromic Substrings', 'Medium'),
      lc('decode-ways', 'Decode Ways', 'Medium'),
      lc('coin-change', 'Coin Change', 'Medium'),
      lc('maximum-product-subarray', 'Maximum Product Subarray', 'Medium'),
      lc('word-break', 'Word Break', 'Medium'),
      lc('longest-increasing-subsequence', 'Longest Increasing Subsequence', 'Medium'),
      lc('partition-equal-subset-sum', 'Partition Equal Subset Sum', 'Medium'),
      lc('unique-paths', 'Unique Paths', 'Medium'),
      lc('longest-common-subsequence', 'Longest Common Subsequence', 'Medium'),
      lc('target-sum', 'Target Sum', 'Medium'),
      lc('interleaving-string', 'Interleaving String', 'Medium'),
    ],
  },
  {
    name: 'Greedy',
    description: 'Interval scheduling and local-choice strategies.',
    problems: [
      lc('maximum-subarray', 'Maximum Subarray', 'Medium'),
      lc('jump-game', 'Jump Game', 'Medium'),
      lc('jump-game-ii', 'Jump Game II', 'Medium'),
      lc('gas-station', 'Gas Station', 'Medium'),
      lc('hand-of-straights', 'Hand of Straights', 'Medium'),
      lc(
        'merge-triplets-to-form-target-triplet',
        'Merge Triplets to Form Target Triplet',
        'Medium',
      ),
      lc('valid-parenthesis-string', 'Valid Parenthesis String', 'Medium'),
      lc('candy', 'Candy', 'Hard'),
      lc('maximize-sum-of-array-after-k-negations', 'Maximize Sum After K Negations', 'Easy'),
      lc(
        'maximum-number-of-events-that-can-be-attended',
        'Maximum Number of Events That Can Be Attended',
        'Medium',
      ),
      lc(
        'minimum-number-of-arrows-to-burst-balloons',
        'Minimum Number of Arrows to Burst Balloons',
        'Medium',
      ),
      lc('meeting-rooms-ii', 'Meeting Rooms II', 'Medium'),
      lc('non-overlapping-intervals', 'Non-overlapping Intervals', 'Medium'),
      lc('task-scheduler', 'Task Scheduler', 'Medium'),
      lc('assign-cookies', 'Assign Cookies', 'Easy'),
    ],
  },
  {
    name: 'Monotonic Stack',
    description: 'Next greater element and histogram patterns.',
    problems: [
      lc('daily-temperatures', 'Daily Temperatures', 'Medium'),
      lc('largest-rectangle-in-histogram', 'Largest Rectangle in Histogram', 'Hard'),
      lc('car-fleet', 'Car Fleet', 'Medium'),
      lc('remove-k-digits', 'Remove K Digits', 'Medium'),
      lc('monotonic-array', 'Monotonic Array', 'Easy'),
      lc('132-pattern', '132 Pattern', 'Medium'),
      lc('next-greater-element-i', 'Next Greater Element I', 'Easy'),
      lc('next-greater-element-ii', 'Next Greater Element II', 'Medium'),
      lc('online-stock-span', 'Online Stock Span', 'Medium'),
      lc('sum-of-subarray-minimums', 'Sum of Subarray Minimums', 'Medium'),
      lc('asteroid-collision', 'Asteroid Collision', 'Medium'),
      lc(
        'remove-all-adjacent-duplicates-in-string-ii',
        'Remove All Adjacent Duplicates in String II',
        'Medium',
      ),
      lc('validate-stack-sequences', 'Validate Stack Sequences', 'Medium'),
      lc('decode-string', 'Decode String', 'Medium'),
      lc('remove-duplicate-letters', 'Remove Duplicate Letters', 'Medium'),
    ],
  },
];