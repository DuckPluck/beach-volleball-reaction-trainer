import type { Depth, Player, Position, Scenario, View } from "./model";

type Layout = {
  title: string;
  depth: Depth;
  opponents: [Player, Player];
  correct: number[];
  explanation: string;
};

const positions: Position[] = ["left", "center", "right"];
const attackX: Record<Position, number> = {
  left: -2.7,
  center: 0,
  right: 2.7,
};
const cameraZ: Record<Depth, number> = { near: 2.5, middle: 4.7, far: 7 };

const blockLayouts: Layout[] = [
  {
    title: "Блок перед атакой, защитник на левой линии",
    depth: "near",
    opponents: [
      { x: 0, z: -0.35, pose: "block" },
      { x: -3.95, z: -6.6, pose: "ready" },
    ],
    correct: [3, 6, 9],
    explanation:
      "Блокирующий находится перед точкой атаки, а защитник держит левую линию. Свободнее правая полоса поля.",
  },
  {
    title: "Блок перед атакой, защитник на правой линии",
    depth: "near",
    opponents: [
      { x: 0, z: -0.35, pose: "block" },
      { x: 3.95, z: -6.6, pose: "ready" },
    ],
    correct: [1, 4, 7],
    explanation:
      "Блокирующий закрывает направление перед атакой, защитник стоит у правой боковой линии. Свободнее левая полоса.",
  },
  {
    title: "Блок перед атакой, защитник в глубине",
    depth: "near",
    opponents: [
      { x: 0, z: -0.35, pose: "block" },
      { x: 0, z: -7.2, pose: "ready" },
    ],
    correct: [1, 3],
    explanation:
      "Блок стоит перед точкой атаки, второй игрок держит центр задней линии. Короткие боковые зоны требуют от него самого длинного рывка.",
  },
  {
    title: "Блок перед атакой, защитник смещается",
    depth: "near",
    opponents: [
      { x: 0, z: -0.35, pose: "block" },
      { x: -1.6, z: -5.4, pose: "runLeft" },
    ],
    correct: [3, 6],
    explanation:
      "Блокирующий остаётся перед атакой, а защитник уже движется влево. Короткая и средняя зоны справа открыты сильнее.",
  },
];

const defenseLayouts: Layout[] = [
  {
    title: "Оба защитника на задней линии",
    depth: "far",
    opponents: [
      { x: -2.4, z: -7.95, pose: "ready" },
      { x: 2.4, z: -7.95, pose: "ready" },
    ],
    correct: [1, 2, 3],
    explanation:
      "Оба соперника стоят на задней линии. Передняя треть поля свободна.",
  },
  {
    title: "Оба защитника вышли вперёд",
    depth: "middle",
    opponents: [
      { x: -1.9, z: -2, pose: "ready" },
      { x: 1.9, z: -2, pose: "ready" },
    ],
    correct: [7, 8, 9],
    explanation:
      "Оба соперника близко к сетке. За их спинами открыта задняя линия.",
  },
  {
    title: "Защита прижата к левой линии",
    depth: "far",
    opponents: [
      { x: -3.95, z: -7.1, pose: "ready" },
      { x: -2.7, z: -3.1, pose: "runLeft" },
    ],
    correct: [3, 6, 9],
    explanation:
      "Один защитник стоит прямо у левой боковой линии, второй движется туда же. Правая полоса, включая дальний угол, остаётся свободной.",
  },
  {
    title: "Защита прижата к правой линии",
    depth: "far",
    opponents: [
      { x: 3.95, z: -7.1, pose: "ready" },
      { x: 2.7, z: -3.1, pose: "runRight" },
    ],
    correct: [1, 4, 7],
    explanation:
      "Один защитник стоит прямо у правой боковой линии, второй движется туда же. Левая полоса, включая дальний угол, остаётся свободной.",
  },
  {
    title: "Защитники держат боковые линии",
    depth: "middle",
    opponents: [
      { x: -3.95, z: -4.8, pose: "ready" },
      { x: 3.95, z: -4.8, pose: "ready" },
    ],
    correct: [2, 5, 8],
    explanation:
      "Соперники стоят на боковых линиях. Центральная полоса находится дальше всего от обоих.",
  },
  {
    title: "Задняя линия и рывок влево",
    depth: "near",
    opponents: [
      { x: 0, z: -7.95, pose: "ready" },
      { x: -2.6, z: -2.3, pose: "runLeft" },
    ],
    correct: [3, 6],
    explanation:
      "Глубокий защитник контролирует дальние удары, второй уже уходит влево. Справа свободнее короткая и средняя зоны.",
  },
  {
    title: "Задняя линия и рывок вправо",
    depth: "near",
    opponents: [
      { x: 0, z: -7.95, pose: "ready" },
      { x: 2.6, z: -2.3, pose: "runRight" },
    ],
    correct: [1, 4],
    explanation:
      "Игрок на задней линии контролирует глубину, второй уже уходит вправо. Слева свободнее короткая и средняя зоны.",
  },
  {
    title: "Защитники расходятся к линиям",
    depth: "middle",
    opponents: [
      { x: -1.4, z: -3.5, pose: "runLeft" },
      { x: 1.4, z: -5.6, pose: "runRight" },
    ],
    correct: [2, 5],
    explanation:
      "Оба соперника движутся к боковым линиям. Короткий и средний центр открываются между ними.",
  },
];

function partner(position: Position, index: number): Player {
  return {
    x:
      position === "left"
        ? 2.5
        : position === "right"
          ? -2.5
          : index % 2
            ? -2.5
            : 2.5,
    z: 3.3 + (index % 3) * 0.45,
    pose: index % 3 === 2 ? "runRight" : "ready",
  };
}

const blockScenarios = blockLayouts.flatMap((layout, index) =>
  positions.flatMap((position) =>
    (["ground", "jump"] as View[]).map((view) => ({
      ...layout,
      id: `block-${index}-${view}-${position}`,
      mode: "block" as const,
      view,
      position,
      depth: "near" as const,
      camera: { x: attackX[position], z: view === "jump" ? 1.6 : 2.5 },
      opponents: [
        { ...layout.opponents[0], x: attackX[position] },
        { ...layout.opponents[1] },
      ] as [Player, Player],
      partner: partner(position, index),
    })),
  ),
);

const defenseScenarios = defenseLayouts.flatMap((layout, index) =>
  positions.map((position) => ({
    ...layout,
    id: `defense-${index}-ground-${position}`,
    mode: "defense" as const,
    view: "ground" as const,
    position,
    camera: { x: attackX[position], z: cameraZ[layout.depth] },
    opponents: layout.opponents.map((player) => ({ ...player })) as [
      Player,
      Player,
    ],
    partner: partner(position, index),
  })),
);

const zoneRatings: Record<
  number,
  { weak: number[]; veryWeak: number[] }
> = {
  3: { weak: [1, 3, 9], veryWeak: [6] },
  4: { weak: [1, 3, 9], veryWeak: [6] },
  5: { weak: [9, 6], veryWeak: [1] },
  6: { weak: [6, 5], veryWeak: [1] },
  7: { weak: [7, 4, 5], veryWeak: [3] },
  8: { weak: [5, 4], veryWeak: [3] },
  9: { weak: [1, 3, 7], veryWeak: [4] },
  10: { weak: [1, 3, 7], veryWeak: [4] },
  11: { weak: [], veryWeak: [4, 7, 1] },
  12: { weak: [], veryWeak: [4, 7, 1] },
  13: { weak: [6], veryWeak: [3] },
  14: { weak: [6, 2], veryWeak: [3] },
  15: { weak: [4, 6], veryWeak: [1, 3] },
  16: { weak: [4, 6, 7, 9], veryWeak: [1, 3] },
  17: { weak: [4, 5], veryWeak: [1] },
  18: { weak: [4, 5, 7], veryWeak: [1] },
  19: { weak: [6, 9], veryWeak: [3] },
  20: { weak: [], veryWeak: [3, 9, 6] },
};

function uncoveredTarget(player: Player, other: Player, correct: number[]) {
  const third = 8 / 3,
    freeX =
      correct.reduce(
        (sum, zone) => sum + (((zone - 1) % 3) - 1) * third,
        0,
      ) / correct.length;
  return {
    x:
      other.x < -third / 2
        ? third / 2
        : other.x > third / 2
          ? -third / 2
          : freeX < 0
            ? -third
            : freeX > 0
              ? third
              : player.x < 0
                ? third
                : -third,
    z: -4 + (-8 + 4) / 3,
  };
}

function directMovingPlayers(scenario: Scenario): Scenario {
  const opponents = scenario.opponents.map((player, index) => {
    if (
      Math.abs(player.x) < 3.9 &&
      player.z > -7.9 &&
      !player.pose.startsWith("run")
    )
      return player;
    const other = scenario.opponents[index ? 0 : 1],
      target = uncoveredTarget(player, other, scenario.correct);
    return {
      ...player,
      pose: target.x < player.x ? ("runLeft" as const) : ("runRight" as const),
      target,
    };
  }) as [Player, Player];
  return { ...scenario, opponents };
}

export const SCENARIOS: Scenario[] = [
  ...blockScenarios,
  ...defenseScenarios,
].map((scenario, index) => {
  const rating = zoneRatings[index + 1];
  return directMovingPlayers({
    ...scenario,
    correct: rating ? [...rating.weak, ...rating.veryWeak] : scenario.correct,
    veryWeak: rating?.veryWeak ?? scenario.correct,
    explanation: rating
      ? "Учитывай положение блока и направление второго игрока. Очень слабая зона даёт больше очков."
      : scenario.explanation,
  });
});
