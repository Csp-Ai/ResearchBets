export type SlipLeg = {
  leg_id: string;
  league?: string;
  game_id?: string;
  team?: string;
  player?: string;
  market: string;
  line?: number;
  odds?: number | string;
  side?: 'over' | 'under' | 'yes' | 'no';
  notes?: string;
};

export type SlipDraft = {
  slip_id?: string;
  legs: SlipLeg[];
  title?: string;
  source?: 'board' | 'manual' | 'ingest' | 'import';
};

const hashText = (value: string): string => {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) + value.charCodeAt(index);
  }
  return Math.abs(hash).toString(36);
};

export const ensureLegIds = <T extends Partial<SlipLeg>>(legs: T[]): Array<T & Pick<SlipLeg, 'leg_id'>> => {
  return legs.map((leg, index) => {
    if (leg.leg_id) return leg as T & Pick<SlipLeg, 'leg_id'>;
    const seed = `${index}|${leg.player ?? ''}|${leg.team ?? ''}|${leg.market ?? ''}|${leg.line ?? ''}|${leg.odds ?? ''}`;
    return {
      ...leg,
      leg_id: `leg_${index}_${hashText(seed)}`
    } as T & Pick<SlipLeg, 'leg_id'>;
  });
};
