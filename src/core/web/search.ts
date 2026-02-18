export interface SearchSource {
  name: string;
  domain: string;
  url: string;
  trust: 'official' | 'book' | 'aggregator';
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
      name: `${normalizedSport}_${kind}_official`,
      domain: 'official.researchbets.internal',
      url: `https://official.researchbets.internal/${kind}?sport=${normalizedSport}`,
      trust: 'official',
    },
    {
      name: `${normalizedSport}_${kind}_book`,
      domain: 'book.researchbets.internal',
      url: `https://book.researchbets.internal/${kind}?sport=${normalizedSport}`,
      trust: 'book',
    },
    {
      name: `${normalizedSport}_${kind}_aggregator`,
      domain: 'aggregator.researchbets.internal',
      url: `https://aggregator.researchbets.internal/${kind}?sport=${normalizedSport}`,
      trust: 'aggregator',
    },
  ];
};
