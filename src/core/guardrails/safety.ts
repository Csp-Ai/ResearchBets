const piiPatterns = [/\b\d{3}-\d{2}-\d{4}\b/g, /\b\d{16}\b/g, /\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g];
const suspiciousPatterns = [/ignore previous instructions/i, /system prompt/i, /developer message/i];

const allowedHosts = new Set(['trusted.example.com', 'news.example.com']);

export const sanitizeUntrustedText = (value: string): string => {
  return value.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
};

export const redactPii = (value: string): string => {
  return piiPatterns.reduce((acc, pattern) => acc.replace(pattern, '[REDACTED]'), value);
};

export const isAllowedCitationUrl = (url: string | undefined): boolean => {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return allowedHosts.has(parsed.hostname);
  } catch {
    return false;
  }
};

export const isSuspiciousEvidence = (text: string): boolean => suspiciousPatterns.some((pattern) => pattern.test(text));
