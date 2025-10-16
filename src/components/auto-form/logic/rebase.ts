import type { NormalizedNode } from "./types";

/**
 * Clones a normalized node tree and rewrites its `path` properties so it can
 * be reused at another location (e.g., when rendering array or record entries).
 *
 * @param node The normalized node to clone.
 * @param base The new dot-path base that should replace the original path.
 * @returns A deep-cloned node tree with updated paths.
 */
export function rebase(node: NormalizedNode, base: string): NormalizedNode {
  const clone = structuredClone(node);

  /**
   * Recursively updates path metadata for a cloned node tree based on the
   * provided base path. As separate function to allow recursion.
   * @param n Current node being rewritten.
   * @param currentBase The base path to apply to this node.
   * @return void
   */
  function rewrite(n: NormalizedNode, currentBase: string) {
    n.path = currentBase;
    if (n.properties) {
      for (const child of n.properties) {
        const leaf = child.path.split(".").slice(-1)[0];
        rewrite(child, `${currentBase}.${leaf}`);
      }
    }
    if (n.item) rewrite(n.item, `${currentBase}.$item`);
    if (n.oneOf) {
      for (const alt of n.oneOf) rewrite(alt, currentBase);
    }
  }
  rewrite(clone, base);

  return clone;
}
