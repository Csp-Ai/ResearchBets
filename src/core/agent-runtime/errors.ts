import { ZodError } from 'zod';

import type { AgentError } from './types';

export enum AgentErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  INVALID_OUTPUT = 'INVALID_OUTPUT',
  DEPENDENCY_ERROR = 'DEPENDENCY_ERROR',
  AGENT_TIMEOUT = 'AGENT_TIMEOUT',
  AGENT_EXECUTION_FAILED = 'AGENT_EXECUTION_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class AgentRuntimeError extends Error {
  constructor(
    public readonly code: AgentErrorCode,
    public readonly type: string,
    message: string,
    public readonly retryable: boolean,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AgentRuntimeError';
  }
}

export const classifyError = (error: unknown): AgentError => {
  if (error instanceof AgentRuntimeError) {
    return {
      code: error.code,
      type: error.type,
      message: error.message,
      retryable: error.retryable,
    };
  }

  if (error instanceof ZodError) {
    return {
      code: AgentErrorCode.INVALID_INPUT,
      type: 'validation',
      message: error.message,
      retryable: false,
    };
  }

  if (error instanceof Error) {
    if (/timeout/i.test(error.message)) {
      return {
        code: AgentErrorCode.AGENT_TIMEOUT,
        type: 'timeout',
        message: error.message,
        retryable: true,
      };
    }

    return {
      code: AgentErrorCode.AGENT_EXECUTION_FAILED,
      type: 'inference',
      message: error.message,
      retryable: false,
    };
  }

  return {
    code: AgentErrorCode.UNKNOWN_ERROR,
    type: 'unknown',
    message: 'Unknown agent runtime error',
    retryable: false,
  };
};
