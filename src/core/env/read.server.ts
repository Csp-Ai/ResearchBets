import 'server-only';

export const readString = (name: string): string | undefined => {
  const value = process.env[name];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const readBool = (name: string): boolean | null => {
  const value = readString(name);
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return null;
};

export const resolveWithAliases = (canonicalName: string, aliases: readonly string[]): string | undefined => {
  return readString(canonicalName) ?? aliases.map((alias) => readString(alias)).find((value) => Boolean(value));
};
