const ANONYMOUS_SESSION_KEY = 'researchbets.anonymous_session_id';

export function getAnonymousSessionId(): string {
  if (typeof window === 'undefined') {
    throw new Error('Anonymous session is only available in the browser runtime.');
  }

  const existingId = window.localStorage.getItem(ANONYMOUS_SESSION_KEY);
  if (existingId) {
    return existingId;
  }

  const generatedId = crypto.randomUUID();
  window.localStorage.setItem(ANONYMOUS_SESSION_KEY, generatedId);

  return generatedId;
}
