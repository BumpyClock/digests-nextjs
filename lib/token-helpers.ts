export type TokenValue = string | number;

export type TokenTree = {
  readonly [key: string]: TokenValue | TokenTree;
};

export const px = (value: number): string => `${value}px`;

export const rem = (value: number): string => `${value}rem`;

export const ms = (value: number): string => `${value}ms`;

export function toKebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .toLowerCase();
}

function isTokenTree(value: TokenValue | TokenTree): value is TokenTree {
  return typeof value === "object" && value !== null;
}

export function flattenTokens(
  tokens: TokenTree,
  path: readonly string[] = []
): Array<[string, TokenValue]> {
  const entries: Array<[string, TokenValue]> = [];

  for (const [key, value] of Object.entries(tokens)) {
    const nextPath = [...path, toKebabCase(key)];
    if (isTokenTree(value)) {
      entries.push(...flattenTokens(value, nextPath));
      continue;
    }

    entries.push([nextPath.join("-"), value]);
  }

  return entries;
}

export function tokensToCssVariables(tokens: TokenTree, prefix?: string): Record<string, string> {
  const variables: Record<string, string> = {};
  const normalizedPrefix = prefix ? `${toKebabCase(prefix)}-` : "";

  for (const [name, value] of flattenTokens(tokens)) {
    variables[`--${normalizedPrefix}${name}`] = String(value);
  }

  return variables;
}

export function createRootCssBlock(variables: Record<string, string>): string {
  const lines = [":root {"];
  for (const [name, value] of Object.entries(variables)) {
    lines.push(`  ${name}: ${value};`);
  }
  lines.push("}");
  return lines.join("\n");
}
