export const parseBody = (body: string, hint?: 'json' | 'html'): Record<string, unknown> => {
  if (hint === 'json' || body.trim().startsWith('{') || body.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(body);
      return typeof parsed === 'object' && parsed != null ? (parsed as Record<string, unknown>) : { value: parsed };
    } catch {
      return { raw: body };
    }
  }

  const titleMatch = body.match(/<title>(.*?)<\/title>/i);
  return {
    title: titleMatch?.[1] ?? null,
    raw: body,
  };
};
