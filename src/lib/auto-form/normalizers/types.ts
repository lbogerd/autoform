import type { FieldSchema } from "../schemas";
import type z from "zod";

/**
 * Shared field type used by all normalizers.
 */
export type AnyField = z.infer<typeof FieldSchema>;

/**
 * Placeholder for future shared utilities needed during normalization.
 *
 * Phase 1 keeps this context intentionally minimal so later phases can grow
 * it without rewriting each normalizer signature.
 */
export interface NormalizationContext {}

export interface UnionOptionsValue {
  selected: number;
  options: unknown[];
}

export type NormalizerFn = (
  field: AnyField,
  value: unknown,
  context: NormalizationContext
) => unknown;
