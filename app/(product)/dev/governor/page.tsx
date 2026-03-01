import { headers } from 'next/headers';

async function getReport() {
  const traceId = headers().get('x-trace-id') ?? 'dev-governor-trace';
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/governor/report?trace_id=${traceId}`, { cache: 'no-store' });
  return response.json();
}

export default async function DevGovernorPage() {
  const report = await getReport();
  return (
    <main className="mx-auto max-w-3xl p-6 font-mono text-sm">
      <h1 className="mb-4 text-lg">Governor report</h1>
      <p className="mb-4">trace_id: {report.trace_id}</p>
      <pre className="rounded border border-white/20 bg-black p-4 text-green-300">
        {report.checks.map((check: { id: string; pass: boolean; level: string; message: string }) => `${check.pass ? '✔' : '✖'} [${check.level}] ${check.id} :: ${check.message}`).join('\n')}
      </pre>
    </main>
  );
}
