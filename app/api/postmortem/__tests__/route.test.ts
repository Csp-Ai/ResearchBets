import { describe, expect, it } from 'vitest';

import { POST } from '../route';

describe('/api/postmortem POST', () => {
  it('returns weakest-leg attribution for aggressive correlated loss profiles', async () => {
    const req = new Request('http://localhost:3000/api/postmortem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outcome: 'loss',
        trace_id: 'trace-123',
        slip_id: 'slip-123',
        parse_status: 'success',
        legs: [
          {
            id: 'leg-1',
            selection: 'Luka Doncic over 31.5 points',
            player: 'Luka Doncic',
            market: 'points',
            game: 'LAL @ DAL',
            odds: '+160',
            line: '31.5',
            expected: 27,
            actual: 24,
            riskFlags: ['same game', 'line moved']
          },
          {
            id: 'leg-2',
            selection: 'Luka Doncic over 8.5 assists',
            player: 'Luka Doncic',
            market: 'assists',
            game: 'LAL @ DAL',
            odds: '+120',
            line: '8.5',
            expected: 9,
            actual: 10
          },
          {
            id: 'leg-3',
            selection: 'LeBron James over 7.5 assists',
            player: 'LeBron James',
            market: 'assists',
            game: 'LAL @ DAL',
            odds: '+125',
            line: '7.5',
            expected: 8,
            actual: 8
          }
        ]
      })
    });

    const response = await POST(req);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.attribution.trace_id).toBe('trace-123');
    expect(payload.attribution.slip_id).toBe('slip-123');
    expect(payload.attribution.weakest_leg).toMatchObject({
      leg_id: 'leg-1',
      player: 'Luka Doncic',
      prop_type: 'points',
      status: 'miss'
    });
    expect(payload.attribution.cause_tags).toEqual(expect.arrayContaining(['line_too_aggressive', 'correlated_legs']));
    expect(payload.report.attribution).toEqual(payload.attribution);
    expect(payload.report.failure_forecast.top_reasons.length).toBeGreaterThan(0);
    expect(payload.credibility.label).toBe('Mixed coverage');
  });

  it('assigns blowout and role-mismatch tags when usage context drifts', async () => {
    const req = new Request('http://localhost:3000/api/postmortem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outcome: 'loss',
        trace_id: 'trace-456',
        slip_id: 'slip-456',
        parse_status: 'partial',
        legs: [
          {
            id: 'leg-1',
            selection: 'Tyrese Haliburton over 24.5 points blowout risk',
            player: 'Tyrese Haliburton',
            market: 'points',
            line: '24.5',
            expected: 19,
            actual: 17,
            minutesTrend: 'down',
            role: 'facilitator',
            riskFlags: ['blowout']
          },
          {
            id: 'leg-2',
            selection: 'Myles Turner over 7.5 rebounds',
            player: 'Myles Turner',
            market: 'rebounds',
            line: '7.5',
            expected: 8,
            actual: 8
          }
        ]
      })
    });

    const response = await POST(req);
    const payload = await response.json();

    expect(payload.attribution.cause_tags).toEqual(expect.arrayContaining(['blowout_minutes_risk', 'role_mismatch', 'injury_or_rotation_shift']));
    expect(payload.attribution.confidence_level).toBe('high');
  });

  it('returns null attribution when parse status failed', async () => {
    const req = new Request('http://localhost:3000/api/postmortem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outcome: 'loss',
        trace_id: 'trace-failed',
        slip_id: 'slip-failed',
        parse_status: 'failed',
        legs: [
          { id: 'leg-1', selection: 'Broken parse leg', player: 'Unknown' }
        ]
      })
    });

    const response = await POST(req);
    const payload = await response.json();

    expect(payload.ok).toBe(true);
    expect(payload.attribution).toBeNull();
    expect(payload.report.attribution).toBeUndefined();
    expect(payload.credibility.partialCoverage).toBe(false);
  });
});
