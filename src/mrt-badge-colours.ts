interface MrtBadgeColour {
  fg: string;
  bg: string;
}

const MRT_BADGE_DEFAULT_COLOUR = {
  bg: '#718472',
  fg: 'white',
} satisfies MrtBadgeColour;

const MRT_BADGE_COLOURS_BY_PREFIX: Readonly<Record<string, MrtBadgeColour>> = {
  NS: { bg: '#E1251B', fg: 'white' },
  EW: { bg: '#00953B', fg: 'white' },
  CG: { bg: '#00953B', fg: 'white' },
  NE: { bg: '#9E28B5', fg: 'white' },
  CC: { bg: '#FF9E18', fg: '#231F20' },
  CE: { bg: '#FF9E18', fg: '#231F20' },
  DE: { bg: '#005DA6', fg: 'white' },
  DT: { bg: '#005DA6', fg: 'white' },
  TE: { bg: '#9D5918', fg: 'white' },
  JR: { bg: '#00B0BE', fg: 'white' },
  JS: { bg: '#00B0BE', fg: 'white' },
  JW: { bg: '#00B0BE', fg: 'white' },
  JE: { bg: '#00B0BE', fg: 'white' },
  CR: { bg: '#94C83D', fg: '#2C2925' },
  CP: { bg: '#94C83D', fg: '#2C2925' },
};

export function getMrtBadgeColourForPrefix(lineCode: string): MrtBadgeColour {
  return (
    MRT_BADGE_COLOURS_BY_PREFIX[lineCode] ??
    (lineCode.endsWith('L')
      ? MRT_BADGE_COLOURS_BY_PREFIX[lineCode.slice(0, -1)]
      : undefined) ??
    MRT_BADGE_DEFAULT_COLOUR
  );
}

export function getMrtBadgeBackgroundForPrefix(lineCode: string) {
  return getMrtBadgeColourForPrefix(lineCode).bg;
}
