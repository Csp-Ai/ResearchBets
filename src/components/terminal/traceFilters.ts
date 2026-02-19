export function hasActiveTraceFilters(eventName: string, agentId: string, errorsOnly: boolean): boolean {
  return eventName !== 'all' || agentId !== 'all' || errorsOnly;
}
