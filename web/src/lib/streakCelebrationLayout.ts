export type CelebrationBloomSlot = { x: number; y: number; scale?: number }

export type CelebrationBouquetLayout = {
  viewBox: string
  bouquetClass: string
  trunk: string
  branches: string[]
  leaves: string[]
  blooms: CelebrationBloomSlot[]
}

/** SVG stem + bloom positions for the full-screen celebration bouquet. */
export function getCelebrationBouquetLayout(tulipCount: number): CelebrationBouquetLayout {
  if (tulipCount <= 1) {
    return {
      viewBox: '0 0 120 160',
      bouquetClass: 'streak-celebration-bouquet-1',
      trunk: 'M60 155 C60 128 57 102 60 78 C62 68 60 62 60 58',
      branches: [],
      leaves: [
        'M60 118 Q32 110 28 94 Q46 102 60 112',
        'M60 102 Q92 94 94 78 Q74 88 60 96',
      ],
      blooms: [{ x: 60, y: 50 }],
    }
  }

  if (tulipCount === 2) {
    return {
      viewBox: '0 0 160 160',
      bouquetClass: 'streak-celebration-bouquet-2 streak-celebration-dual',
      trunk: 'M80 155 C80 128 78 104 80 84',
      branches: [
        'M80 84 C68 78 54 70 46 58',
        'M80 84 C92 78 106 70 114 56',
      ],
      leaves: [
        'M80 120 Q52 112 48 96 Q66 104 80 114',
        'M80 108 Q108 100 110 84 Q92 94 80 102',
      ],
      blooms: [
        { x: 46, y: 50 },
        { x: 114, y: 48, scale: 0.92 },
      ],
    }
  }

  if (tulipCount === 3) {
    return {
      viewBox: '0 0 190 160',
      bouquetClass: 'streak-celebration-bouquet-3',
      trunk: 'M95 155 C95 128 93 104 95 84',
      branches: [
        'M95 84 C74 76 50 68 32 56',
        'M95 84 C95 68 95 46 95 34',
        'M95 84 C116 76 140 68 158 56',
      ],
      leaves: [
        'M95 120 Q68 112 62 96 Q80 104 95 114',
        'M95 108 Q122 100 124 84 Q106 94 95 102',
      ],
      blooms: [
        { x: 32, y: 52 },
        { x: 95, y: 30 },
        { x: 158, y: 52, scale: 0.92 },
      ],
    }
  }

  if (tulipCount === 4) {
    return {
      viewBox: '0 0 210 160',
      bouquetClass: 'streak-celebration-bouquet-4',
      trunk: 'M105 155 C105 128 103 104 105 84',
      branches: [
        'M105 84 C84 78 60 70 42 58',
        'M105 84 C88 70 74 48 62 36',
        'M105 84 C122 70 136 48 148 36',
        'M105 84 C126 78 150 70 168 58',
      ],
      leaves: [
        'M105 120 Q78 112 72 96 Q90 104 105 114',
        'M105 108 Q132 100 134 84 Q116 94 105 102',
      ],
      blooms: [
        { x: 42, y: 54 },
        { x: 62, y: 32, scale: 0.88 },
        { x: 148, y: 32, scale: 0.88 },
        { x: 168, y: 54 },
      ],
    }
  }

  if (tulipCount === 5) {
    return {
      viewBox: '0 0 230 160',
      bouquetClass: 'streak-celebration-bouquet-5',
      trunk: 'M115 155 C115 128 113 104 115 84',
      branches: [
        'M115 84 C92 78 68 70 48 58',
        'M115 84 C98 72 86 50 76 36',
        'M115 84 C115 68 115 46 115 32',
        'M115 84 C132 72 144 50 154 36',
        'M115 84 C138 78 162 70 182 58',
      ],
      leaves: [
        'M115 120 Q88 112 82 96 Q100 104 115 114',
        'M115 108 Q142 100 144 84 Q126 94 115 102',
      ],
      blooms: [
        { x: 48, y: 54 },
        { x: 76, y: 32, scale: 0.86 },
        { x: 115, y: 26, scale: 0.9 },
        { x: 154, y: 32, scale: 0.86 },
        { x: 182, y: 54 },
      ],
    }
  }

  return {
    viewBox: '0 0 250 160',
    bouquetClass: 'streak-celebration-bouquet-6',
    trunk: 'M125 155 C125 128 123 104 125 84',
    branches: [
      'M125 84 C100 78 74 70 52 58',
      'M125 84 C108 72 92 52 78 38',
      'M125 84 C118 68 112 48 104 32',
      'M125 84 C132 68 138 48 146 32',
      'M125 84 C142 72 158 52 172 38',
      'M125 84 C150 78 176 70 198 58',
    ],
    leaves: [
      'M125 120 Q98 112 92 96 Q110 104 125 114',
      'M125 108 Q152 100 154 84 Q136 94 125 102',
    ],
    blooms: [
      { x: 52, y: 54 },
      { x: 78, y: 36, scale: 0.84 },
      { x: 104, y: 28, scale: 0.88 },
      { x: 146, y: 28, scale: 0.88 },
      { x: 172, y: 36, scale: 0.84 },
      { x: 198, y: 54 },
    ],
  }
}
