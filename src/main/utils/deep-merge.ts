/**
 * Deep merge utility for nested configuration objects
 * Preserves user settings while updating Toji-managed values
 *
 * This is critical for:
 * - MCP server configs (user can add their own MCP servers)
 * - Nested permissions, models, etc.
 * - Preserving unknown/future config fields
 */

type MergeableValue = Record<string, unknown> | unknown[] | unknown

/**
 * Check if value is a plain object (not array, not null, not class instance)
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    value.constructor === Object
  )
}

/**
 * Deep merge two objects recursively
 *
 * Rules:
 * - Plain objects are merged recursively
 * - Arrays are replaced (not concatenated)
 * - Primitives from source override target
 * - Undefined values in source are ignored (preserves target)
 *
 * @param target - Base object (user's existing config)
 * @param source - New values to merge in (Toji's updates)
 * @returns Merged object
 */
export function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target }

  for (const key in source) {
    const sourceValue = source[key] as MergeableValue
    const targetValue = result[key] as MergeableValue

    // Skip undefined source values - preserves target
    if (sourceValue === undefined) {
      continue
    }

    // If both are plain objects, merge recursively
    if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      ) as T[Extract<keyof T, string>]
    } else {
      // Otherwise, source value replaces target
      result[key] = sourceValue as T[Extract<keyof T, string>]
    }
  }

  return result
}

/**
 * Special merge for MCP section in opencode.json
 * Ensures Toji's MCP server is added/updated without destroying user's MCP servers
 *
 * Example:
 * Existing: { mcp: { userServer: {...}, toji: {...} } }
 * Update:   { mcp: { toji: {...updated...} } }
 * Result:   { mcp: { userServer: {...}, toji: {...updated...} } }
 */
export function mergeMcpConfig(
  existingConfig: Record<string, unknown>,
  mcpServerName: string,
  mcpServerConfig: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = deepMerge({}, existingConfig)

  // Ensure mcp section exists
  if (!result.mcp || !isPlainObject(result.mcp)) {
    result.mcp = {}
  }

  // Merge Toji's MCP server config into mcp section
  const mcpSection = result.mcp as Record<string, unknown>
  mcpSection[mcpServerName] = mcpServerConfig

  return result
}
