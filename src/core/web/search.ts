export interface SearchSource {
  name: string;
  domain: string;
  url: string;
  trust: 'primary' | 'secondary';
}

export const findSources = ({
  sport,
  kind,
}: {
  sport: string;
  kind: 'odds' | 'results' | 'news';
}): SearchSource[] => {
  const normalizedSport = sport.toLowerCase();
  return [
    {
      name: `${normalizedSport}_${kind}_primary`,
      domain: 'api.researchbets.internal',
      url: `https://api.researchbets.internal/${kind}?sport=${normalizedSport}`,
      trust: 'primary',
    },
  ];
};
