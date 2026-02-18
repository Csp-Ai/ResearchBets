#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const policyPath = path.resolve('docs/security/audit-policy.json');

function loadPolicy() {
  const rawPolicy = readFileSync(policyPath, 'utf8');
  const parsed = JSON.parse(rawPolicy);
  const allowedAdvisories = Array.isArray(parsed.allowedAdvisories)
    ? parsed.allowedAdvisories
    : [];

  return new Map(
    allowedAdvisories.map((entry) => [String(entry.id), entry])
  );
}

function runAudit() {
  try {
    return execSync('npm audit --omit=dev --json', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    // npm audit exits non-zero when it finds vulnerabilities.
    if (typeof error.stdout === 'string' && error.stdout.trim().startsWith('{')) {
      return error.stdout;
    }
    throw error;
  }
}

function extractAdvisories(report) {
  const vulnerabilities = report?.vulnerabilities ?? {};
  const advisories = [];

  for (const [packageName, vulnerability] of Object.entries(vulnerabilities)) {
    const viaEntries = Array.isArray(vulnerability.via) ? vulnerability.via : [];

    for (const via of viaEntries) {
      if (typeof via !== 'object' || via === null) {
        continue;
      }

      const id = via.source ?? via.url ?? `${packageName}:${via.title ?? 'unknown'}`;
      advisories.push({
        id: String(id),
        packageName,
        severity: via.severity ?? vulnerability.severity ?? 'unknown',
        title: via.title ?? 'Unknown advisory',
        url: via.url ?? 'n/a',
        range: via.range ?? vulnerability.range ?? 'n/a',
      });
    }
  }

  const deduped = new Map();
  for (const advisory of advisories) {
    deduped.set(advisory.id, advisory);
  }

  return [...deduped.values()];
}

function classifyAdvisory(advisory, allowlist) {
  const allowlistEntry = allowlist.get(advisory.id);

  if (!allowlistEntry) {
    return {
      status: 'BLOCKED',
      reason: 'Not allowlisted',
      expiresOn: null,
      allowlistReason: null,
    };
  }

  const expiresOnRaw = allowlistEntry.expiresOn;
  const expiresOnDate = new Date(`${expiresOnRaw}T23:59:59.999Z`);
  const isValidDate = !Number.isNaN(expiresOnDate.getTime());
  if (!isValidDate) {
    return {
      status: 'BLOCKED',
      reason: `Invalid expiration date (${expiresOnRaw ?? 'missing'})`,
      expiresOn: expiresOnRaw ?? null,
      allowlistReason: allowlistEntry.reason ?? null,
    };
  }

  const now = new Date();
  if (expiresOnDate < now) {
    return {
      status: 'BLOCKED',
      reason: 'Allowlist entry expired',
      expiresOn: expiresOnRaw,
      allowlistReason: allowlistEntry.reason ?? null,
    };
  }

  return {
    status: 'ALLOWED',
    reason: 'Allowlisted and unexpired',
    expiresOn: expiresOnRaw,
    allowlistReason: allowlistEntry.reason ?? null,
  };
}

function main() {
  const allowlist = loadPolicy();
  const auditOutput = runAudit();
  const auditReport = JSON.parse(auditOutput);
  const advisories = extractAdvisories(auditReport);

  console.log('=== Production Audit Policy Report ===');
  console.log(`Policy file: ${path.relative(process.cwd(), policyPath)}`);

  if (advisories.length === 0) {
    console.log('No production advisories reported by npm audit.');
    process.exit(0);
  }

  const results = advisories.map((advisory) => ({
    advisory,
    classification: classifyAdvisory(advisory, allowlist),
  }));

  for (const { advisory, classification } of results) {
    console.log('---');
    console.log(
      `[${classification.status}] ${advisory.id} | ${advisory.packageName} | ${advisory.severity}`
    );
    console.log(`Title: ${advisory.title}`);
    console.log(`Range: ${advisory.range}`);
    console.log(`URL: ${advisory.url}`);
    console.log(`Status reason: ${classification.reason}`);

    if (classification.allowlistReason) {
      console.log(`Allowlist reason: ${classification.allowlistReason}`);
    }

    if (classification.expiresOn) {
      console.log(`Allowlist expiresOn: ${classification.expiresOn}`);
    }
  }

  const blocked = results.filter((result) => result.classification.status === 'BLOCKED');
  const allowed = results.length - blocked.length;

  console.log('---');
  console.log(
    `Summary: ${results.length} advisory(ies), ${allowed} allowlisted, ${blocked.length} blocking.`
  );

  if (blocked.length > 0) {
    process.exitCode = 1;
    console.error('Audit policy check failed. Resolve or allowlist blocking advisories.');
    return;
  }

  console.log('Audit policy check passed. All production advisories are allowlisted and unexpired.');
}

main();
