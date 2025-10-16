import type { NormalizedNode } from "@/components/auto-form/logic/types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple class names into a single string, merging conflicting
 * Tailwind CSS classes intelligently.
 * @param inputs Class names or conditional class objects.
 * @returns A merged class name string.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes arbitrary strings into deterministic test IDs that work with the
 * rendered DOM and testing-library queries.
 *
 * @param value Raw identifier that may include whitespace or punctuation.
 * @returns A kebab-cased identifier limited to characters safe for selectors.
 */
export const sanitizeTestId = (value: string) =>
  value.replace(/[^A-Za-z0-9_-]+/g, "-");

/**
 * Builds a stable test identifier for a node, optionally appending a suffix
 * for more specific UI controls like buttons or inputs derived from the node.
 *
 * @param node The normalized schema node being rendered.
 * @param suffix Optional extra label to disambiguate related controls.
 * @returns A sanitized identifier suitable for `data-testid` usage.
 */
export function getNodeTestId(node: NormalizedNode, suffix?: string): string {
  const fallback = node.path ? node.path : "field";
  const base = node.ui?.testId ?? fallback;

  if (!suffix) return base;

  return `${base}-${sanitizeTestId(suffix)}`;
}
