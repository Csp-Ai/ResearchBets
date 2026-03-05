import 'server-only';

export type RuntimeContext = {
  vercelEnv: string;
  nodeEnv: string;
  isVercelProd: boolean;
};

export function getRuntimeContext(): RuntimeContext {
  const vercelEnv = process.env.VERCEL_ENV ?? 'unset';
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  return {
    vercelEnv,
    nodeEnv,
    isVercelProd: vercelEnv === 'production',
  };
}
