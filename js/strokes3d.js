/**
 * Tennis Pro Analytics 3D — AceCue Stroke Biomechanics & 3D Keyframe Database
 * Coordinate System (in meters):
 *   X: Lateral (- left / + right from behind view)
 *   Y: Vertical height above court floor (0.00 = court surface)
 *   Z: Court depth (0.00 = baseline, +Z = forward toward net, -Z = behind baseline)
 */

window.ACECUE_STROKES = {
  forehand: {
    id: 'forehand',
    name: 'Удар справа (Forehand Topspin)',
    proName: 'Роджер Федерер (ATP Эталон)',
    score: 7.6,
    subScores: {
      prep: 8.5,
      footwork: 7.2,
      loading: 7.8,
      contact: 6.4,
      follow: 8.1
    },
    stanceTypePro: 'Полуоткрытая (Semi-Open 42°)',
    stanceTypeUser: 'Слишком открытая без шага (Open 78°)',
    strengths: [
      'Своевременный разворот плеч (Unit Turn) с левой рукой перед собой',
      'Хорошее тыльное сгибание кисти (Wrist Lag 72°) перед разгоном'
    ],
    top3Fixes: [
      {
        priority: 1,
        title: 'Точка контакта позади бедра (Late Contact -18 см)',
        impact: 'Критично (-22% скорости мяча)',
        desc: 'Вы встречаете мяч на одной линии с корпусом вместо выноса точки удара на 32–38 см вперёд перед ведущим бедром.',
        phaseKey: 'T2'
      },
      {
        priority: 2,
        title: 'Зажатый локоть и отсутствие переноса веса на переднюю стопу',
        impact: 'Высокий приоритет (-15 км/ч)',
        desc: 'В момент удара на передней (левой) ноге всего 48% веса (у профи 84%), а локоть согнут под 136° вместо свободного рычага 164°.',
        phaseKey: 'T2'
      },
      {
        priority: 3,
        title: 'Слабый подсед и неполный разворот задней стопы (Пивот)',
        impact: 'Средний приоритет',
        desc: 'Колени согнуты лишь на 162° (норма 130°). Задняя правая стопа остаётся приклеенной к корту и блокирует полное раскрытие таза к сетке.',
        phaseKey: 'T1'
      }
    ],
    drills: [
      {
        name: 'Дрилл «Шаг через конус + Удар впереди бедра»',
        duration: '10 мин · 3 серии по 15 мячей',
        desc: 'Поставьте конус в 35 см впереди левого бедра. Набросьте мяч с руки: задача — перенести вес с правой ноги на левую с отрывом правой пятки и ударить строго над конусом.'
      },
      {
        name: 'Дрилл «Пауза в подседе (Drop & Hold)»',
        duration: '8 мин · Работа с корзиной',
        desc: 'В фазе T0–T1 зафиксируйте сгиб коленей ~130° на 0.3 сек до старта ракетки вперёд, выталкивая себя вверх-вперёд ногами.'
      },
      {
        name: 'Дрилл «Спектр дистанции (Spacer Ball)»',
        duration: '7 мин · Набивание у стенки/с партнёром',
        desc: 'Держите в подмышке небьющей руки теннисный мяч до фазы T1, а бьющую руку выпрямляйте на максимальном удалении от рёбер.'
      }
    ],
    phases: [
      { key: 'T0', t: 0.00, label: 'T0: Разножка и Загрузка', short: 'T0: Загрузка' },
      { key: 'T1', t: 0.38, label: 'T1: Опускание ракетки и Подсед', short: 'T1: Петля' },
      { key: 'T2', t: 0.62, label: 'T2: Точка контакта (Вынос вперёд)', short: 'T2: Контакт' },
      { key: 'T3', t: 0.80, label: 'T3: Проводка и Пивот стопы', short: 'T3: Проводка' },
      { key: 'T4', t: 1.00, label: 'T4: Выход из удара и Сплит', short: 'T4: Рекавери' }
    ],
    // 3D Keyframes for Pro (Federer)
    proKeyframes: [
      {
        t: 0.00, // T0: Unit Turn & Loading on back (right) foot
        pelvisPos: [0.15, 0.92, -0.10],
        pelvisYaw: -52,
        chestYaw: -98,
        headYaw: -15,
        kneeBendDeg: 138,
        elbowAngleDeg: 124,
        contactOffsetCm: 0,
        weightR: 78, weightL: 22,
        footR: { ankle: [0.38, 0.08, -0.18], heel: [0.42, 0.02, -0.24], toe: [0.52, 0.02, -0.02], yaw: -75 },
        footL: { ankle: [-0.15, 0.08, 0.12], heel: [-0.18, 0.02, 0.04], toe: [-0.10, 0.02, 0.28], yaw: -25 },
        kneeR: [0.42, 0.48, -0.05],
        kneeL: [-0.14, 0.50, 0.22],
        hipR: [0.30, 0.92, -0.15],
        hipL: [0.00, 0.92, -0.05],
        shR: [0.22, 1.38, -0.28],
        shL: [0.08, 1.40, 0.10],
        elR: [0.35, 1.18, -0.52],
        wrR: [0.30, 1.36, -0.68],
        rTip: [0.22, 1.78, -0.78],
        rFaceNormal: [0.6, 0.1, 0.8],
        elL: [-0.12, 1.24, 0.28],
        wrL: [0.05, 1.30, 0.35],
        head: [0.15, 1.62, -0.06],
        ball: [0.48, 1.25, 1.85]
      },
      {
        t: 0.38, // T1: Deep Knee Load, Hip Initiation, Racket Drop & Wrist Lag
        pelvisPos: [0.10, 0.84, 0.02],
        pelvisYaw: -22,
        chestYaw: -68,
        headYaw: -8,
        kneeBendDeg: 128,
        elbowAngleDeg: 132,
        contactOffsetCm: 10,
        weightR: 55, weightL: 45,
        footR: { ankle: [0.38, 0.09, -0.16], heel: [0.40, 0.05, -0.24], toe: [0.50, 0.02, -0.02], yaw: -60 },
        footL: { ankle: [-0.22, 0.08, 0.22], heel: [-0.25, 0.02, 0.12], toe: [-0.18, 0.02, 0.38], yaw: -15 },
        kneeR: [0.36, 0.44, 0.02],
        kneeL: [-0.22, 0.46, 0.34],
        hipR: [0.26, 0.84, -0.04],
        hipL: [-0.06, 0.84, 0.08],
        shR: [0.25, 1.30, -0.12],
        shL: [-0.05, 1.33, 0.16],
        elR: [0.44, 1.02, -0.22],
        wrR: [0.48, 0.86, -0.15],
        rTip: [0.42, 0.58, -0.52],
        rFaceNormal: [0.2, -0.65, 0.72],
        elL: [-0.24, 1.18, 0.34],
        wrL: [-0.18, 1.24, 0.46],
        head: [0.10, 1.54, 0.04],
        ball: [0.48, 1.02, 0.85]
      },
      {
        t: 0.62, // T2: Contact Point — 35cm in front of hip, straight-arm leverage, weight on front foot
        pelvisPos: [0.04, 0.94, 0.15],
        pelvisYaw: 12,
        chestYaw: 18,
        headYaw: 5,
        kneeBendDeg: 132,
        elbowAngleDeg: 165,
        contactOffsetCm: 35,
        weightR: 16, weightL: 84,
        footR: { ankle: [0.34, 0.14, -0.08], heel: [0.36, 0.14, -0.18], toe: [0.38, 0.02, 0.04], yaw: -20 },
        footL: { ankle: [-0.22, 0.08, 0.24], heel: [-0.25, 0.02, 0.14], toe: [-0.18, 0.02, 0.40], yaw: -10 },
        kneeR: [0.28, 0.50, 0.10],
        kneeL: [-0.20, 0.52, 0.32],
        hipR: [0.20, 0.94, 0.18],
        hipL: [-0.12, 0.94, 0.12],
        shR: [0.24, 1.38, 0.24],
        shL: [-0.14, 1.40, 0.10],
        elR: [0.42, 1.20, 0.38],
        wrR: [0.52, 1.05, 0.52],
        rTip: [0.88, 1.02, 0.56],
        rFaceNormal: [0.0, -0.12, 0.99],
        elL: [-0.30, 1.16, 0.12],
        wrL: [-0.26, 1.08, 0.02],
        head: [0.06, 1.62, 0.20],
        ball: [0.74, 1.04, 0.58]
      },
      {
        t: 0.80, // T3: Extension & Windshield Wiper Finish, back foot pivots forward
        pelvisPos: [0.00, 0.98, 0.22],
        pelvisYaw: 38,
        chestYaw: 55,
        headYaw: 12,
        kneeBendDeg: 146,
        elbowAngleDeg: 118,
        contactOffsetCm: 0,
        weightR: 25, weightL: 75,
        footR: { ankle: [0.26, 0.12, 0.12], heel: [0.26, 0.14, 0.00], toe: [0.26, 0.02, 0.24], yaw: 10 },
        footL: { ankle: [-0.22, 0.08, 0.24], heel: [-0.25, 0.02, 0.14], toe: [-0.18, 0.02, 0.40], yaw: 0 },
        kneeR: [0.20, 0.52, 0.24],
        kneeL: [-0.20, 0.54, 0.30],
        hipR: [0.14, 0.98, 0.28],
        hipL: [-0.14, 0.98, 0.16],
        shR: [0.12, 1.42, 0.34],
        shL: [-0.18, 1.40, 0.08],
        elR: [-0.08, 1.46, 0.44],
        wrR: [-0.28, 1.48, 0.26],
        rTip: [-0.42, 1.62, -0.08],
        rFaceNormal: [-0.7, -0.3, 0.6],
        elL: [-0.32, 1.15, 0.02],
        wrL: [-0.28, 1.26, 0.14],
        head: [0.02, 1.66, 0.24],
        ball: [0.15, 1.65, 2.40]
      },
      {
        t: 1.00, // T4: Dynamic Recovery & Split-Step Ready
        pelvisPos: [0.00, 0.92, 0.05],
        pelvisYaw: 0,
        chestYaw: 0,
        headYaw: 0,
        kneeBendDeg: 140,
        elbowAngleDeg: 115,
        contactOffsetCm: 0,
        weightR: 50, weightL: 50,
        footR: { ankle: [0.28, 0.08, 0.05], heel: [0.28, 0.02, -0.05], toe: [0.30, 0.02, 0.18], yaw: 0 },
        footL: { ankle: [-0.28, 0.08, 0.05], heel: [-0.28, 0.02, -0.05], toe: [-0.30, 0.02, 0.18], yaw: 0 },
        kneeR: [0.28, 0.48, 0.14],
        kneeL: [-0.28, 0.48, 0.14],
        hipR: [0.16, 0.92, 0.05],
        hipL: [-0.16, 0.92, 0.05],
        shR: [0.20, 1.38, 0.06],
        shL: [-0.20, 1.38, 0.06],
        elR: [0.24, 1.12, 0.22],
        wrR: [0.04, 1.16, 0.34],
        rTip: [0.00, 1.42, 0.52],
        rFaceNormal: [0.0, 0.0, 1.0],
        elL: [-0.24, 1.12, 0.22],
        wrL: [-0.04, 1.16, 0.34],
        head: [0.00, 1.62, 0.08],
        ball: [-0.40, 1.20, 4.20]
      }
    ],
    // 3D Keyframes for User (Showing common semi-pro/club flaws: straight knees, jammed elbow, late contact, planted back foot)
    userKeyframes: [
      {
        t: 0.00,
        pelvisPos: [0.12, 1.00, -0.12],
        pelvisYaw: -28,
        chestYaw: -58,
        headYaw: -5,
        kneeBendDeg: 164,
        elbowAngleDeg: 105,
        contactOffsetCm: 0,
        weightR: 60, weightL: 40,
        footR: { ankle: [0.32, 0.08, -0.12], heel: [0.32, 0.02, -0.22], toe: [0.36, 0.02, 0.02], yaw: -35 },
        footL: { ankle: [-0.18, 0.08, -0.06], heel: [-0.18, 0.02, -0.16], toe: [-0.18, 0.02, 0.08], yaw: -5 },
        kneeR: [0.32, 0.54, -0.06],
        kneeL: [-0.18, 0.54, 0.00],
        hipR: [0.26, 1.00, -0.14],
        hipL: [-0.04, 1.00, -0.08],
        shR: [0.22, 1.44, -0.22],
        shL: [-0.02, 1.44, 0.02],
        elR: [0.28, 1.22, -0.38],
        wrR: [0.24, 1.38, -0.48],
        rTip: [0.20, 1.72, -0.55],
        rFaceNormal: [0.5, 0.2, 0.8],
        elL: [-0.16, 1.22, 0.14],
        wrL: [-0.08, 1.20, 0.22],
        head: [0.10, 1.68, -0.08],
        ball: [0.48, 1.25, 1.85]
      },
      {
        t: 0.38,
        pelvisPos: [0.10, 0.98, -0.10],
        pelvisYaw: -18,
        chestYaw: -42,
        headYaw: 0,
        kneeBendDeg: 160,
        elbowAngleDeg: 112,
        contactOffsetCm: 0,
        weightR: 58, weightL: 42,
        footR: { ankle: [0.32, 0.08, -0.12], heel: [0.32, 0.02, -0.22], toe: [0.36, 0.02, 0.02], yaw: -35 },
        footL: { ankle: [-0.20, 0.08, 0.02], heel: [-0.20, 0.02, -0.08], toe: [-0.20, 0.02, 0.16], yaw: -5 },
        kneeR: [0.32, 0.52, -0.04],
        kneeL: [-0.20, 0.52, 0.08],
        hipR: [0.25, 0.98, -0.12],
        hipL: [-0.05, 0.98, -0.06],
        shR: [0.24, 1.42, -0.16],
        shL: [-0.06, 1.42, 0.06],
        elR: [0.32, 1.14, -0.24],
        wrR: [0.36, 1.02, -0.18],
        rTip: [0.38, 0.82, -0.42],
        rFaceNormal: [0.3, -0.3, 0.9],
        elL: [-0.20, 1.18, 0.18],
        wrL: [-0.14, 1.16, 0.26],
        head: [0.09, 1.66, -0.06],
        ball: [0.48, 1.02, 0.85]
      },
      {
        t: 0.62, // T2: Jammed elbow (136°), straight knees (163°), Late contact at Z=0.05 instead of Z=0.52, back foot stuck
        pelvisPos: [0.08, 1.00, -0.04],
        pelvisYaw: -4,
        chestYaw: 0,
        headYaw: 18,
        kneeBendDeg: 163,
        elbowAngleDeg: 136,
        contactOffsetCm: -18,
        weightR: 52, weightL: 48,
        footR: { ankle: [0.32, 0.08, -0.12], heel: [0.32, 0.02, -0.22], toe: [0.36, 0.02, 0.02], yaw: -32 },
        footL: { ankle: [-0.20, 0.08, 0.04], heel: [-0.20, 0.02, -0.06], toe: [-0.20, 0.02, 0.18], yaw: -5 },
        kneeR: [0.30, 0.54, -0.04],
        kneeL: [-0.20, 0.54, 0.08],
        hipR: [0.24, 1.00, -0.04],
        hipL: [-0.08, 1.00, -0.04],
        shR: [0.24, 1.44, -0.02],
        shL: [-0.10, 1.44, -0.02],
        elR: [0.30, 1.18, 0.06],
        wrR: [0.40, 1.08, 0.14],
        rTip: [0.68, 1.06, 0.12],
        rFaceNormal: [0.15, 0.18, 0.96],
        elL: [-0.22, 1.18, 0.06],
        wrL: [-0.18, 1.12, 0.02],
        head: [0.08, 1.68, 0.02],
        ball: [0.58, 1.06, 0.16]
      },
      {
        t: 0.80,
        pelvisPos: [0.06, 1.00, -0.02],
        pelvisYaw: 12,
        chestYaw: 25,
        headYaw: 22,
        kneeBendDeg: 165,
        elbowAngleDeg: 102,
        contactOffsetCm: 0,
        weightR: 48, weightL: 52,
        footR: { ankle: [0.32, 0.08, -0.10], heel: [0.32, 0.02, -0.20], toe: [0.35, 0.02, 0.04], yaw: -25 },
        footL: { ankle: [-0.20, 0.08, 0.04], heel: [-0.20, 0.02, -0.06], toe: [-0.20, 0.02, 0.18], yaw: -5 },
        kneeR: [0.30, 0.54, -0.02],
        kneeL: [-0.20, 0.54, 0.08],
        hipR: [0.22, 1.00, 0.00],
        hipL: [-0.10, 1.00, -0.04],
        shR: [0.20, 1.44, 0.06],
        shL: [-0.12, 1.44, -0.06],
        elR: [0.04, 1.38, 0.18],
        wrR: [-0.14, 1.36, 0.12],
        rTip: [-0.26, 1.48, -0.10],
        rFaceNormal: [-0.5, 0.2, 0.8],
        elL: [-0.24, 1.16, 0.00],
        wrL: [-0.20, 1.18, 0.06],
        head: [0.06, 1.68, 0.02],
        ball: [0.15, 1.65, 1.90]
      },
      {
        t: 1.00,
        pelvisPos: [0.04, 1.00, -0.04],
        pelvisYaw: 0,
        chestYaw: 0,
        headYaw: 0,
        kneeBendDeg: 164,
        elbowAngleDeg: 110,
        contactOffsetCm: 0,
        weightR: 50, weightL: 50,
        footR: { ankle: [0.30, 0.08, -0.06], heel: [0.30, 0.02, -0.16], toe: [0.32, 0.02, 0.08], yaw: -10 },
        footL: { ankle: [-0.22, 0.08, -0.02], heel: [-0.22, 0.02, -0.12], toe: [-0.22, 0.02, 0.12], yaw: 0 },
        kneeR: [0.30, 0.54, 0.00],
        kneeL: [-0.22, 0.54, 0.04],
        hipR: [0.20, 1.00, -0.04],
        hipL: [-0.12, 1.00, -0.04],
        shR: [0.22, 1.44, -0.02],
        shL: [-0.14, 1.44, -0.02],
        elR: [0.24, 1.18, 0.12],
        wrR: [0.06, 1.20, 0.22],
        rTip: [0.02, 1.40, 0.36],
        rFaceNormal: [0.0, 0.0, 1.0],
        elL: [-0.20, 1.18, 0.12],
        wrL: [-0.04, 1.20, 0.22],
        head: [0.04, 1.68, 0.00],
        ball: [-0.40, 1.20, 3.60]
      }
    ]
  },

  serve: {
    id: 'serve',
    name: 'Подача (Power Flat / Slice Serve)',
    proName: 'Карлос Алькарас (ATP Эталон)',
    score: 7.1,
    subScores: { prep: 8.2, footwork: 6.8, loading: 6.5, contact: 7.0, follow: 7.4 },
    stanceTypePro: 'Platform / Pinpoint с взрывным прыжком в корт (+45 см)',
    stanceTypeUser: 'Без выноса таза в корт и без прыжка с двух ног',
    strengths: [
      'Стабильный ритм подброса мяча левой рукой',
      'Хороший баланс в начальной фазе замаха'
    ],
    top3Fixes: [
      {
        priority: 1,
        title: 'Недостаточный сгиб коленей в Trophy Pose (154° вместо 118°)',
        impact: 'Критично (-25 км/ч к скорости подачи)',
        desc: 'В момент максимальной загрузки (T1 Trophy Pose) ноги почти прямые. Нет вертикального импульса выпрыгивания к мячу.',
        phaseKey: 'T1'
      },
      {
        priority: 2,
        title: 'Точка контакта слишком низко и позади базовой линии',
        impact: 'Высокий приоритет (Частые попадания в сетку)',
        desc: 'Алькарас бьёт на высоте 2.78 м с входом на 42 см внутрь корта. Ваш контакт происходит на высоте 2.38 м без наклона плечевой оси.',
        phaseKey: 'T2'
      },
      {
        priority: 3,
        title: 'Недостаточная пронация предплечья после удара',
        impact: 'Средний приоритет',
        desc: 'В фазе T3 струнная поверхность не разворачивается ребром/наружу (Pronation), что снижает разгон головки ракетки.',
        phaseKey: 'T3'
      }
    ],
    drills: [
      {
        name: 'Дрилл «Trophy Pose с задержкой и прыжком через линию»',
        duration: '10 мин · 30 подач',
        desc: 'Выполните подброс, сядьте в коленях до 118° (левая рука вертикально вверх, локоть правой под 90°) и приземлитесь левой ногой минимум на 35 см внутри корта.'
      },
      {
        name: 'Дрилл «Пронация ребром и плоскостью у забора»',
        duration: '6 мин · Имитация',
        desc: 'Встаньте в 60 см от сетки/фона и останавливайте ракетку в верхней точке с разворотом струн наружу большим пальцем вниз.'
      }
    ],
    phases: [
      { key: 'T0', t: 0.00, label: 'T0: Ритуал и Начало подброса', short: 'T0: Старт' },
      { key: 'T1', t: 0.42, label: 'T1: Trophy Pose (Подсед и Прогиб)', short: 'T1: Трофи' },
      { key: 'T2', t: 0.64, label: 'T2: Выпрыгивание и Контакт на пике', short: 'T2: Контакт' },
      { key: 'T3', t: 0.82, label: 'T3: Пронация и Приземление в корте', short: 'T3: Приземление' },
      { key: 'T4', t: 1.00, label: 'T4: Выход в боевую стойку', short: 'T4: Баланс' }
    ],
    proKeyframes: [
      {
        t: 0.00,
        pelvisPos: [0.05, 0.94, -0.15], pelvisYaw: -65, chestYaw: -75, headYaw: -10,
        kneeBendDeg: 165, elbowAngleDeg: 145, contactOffsetCm: 0, weightR: 40, weightL: 60,
        footR: { ankle: [0.22, 0.08, -0.32], heel: [0.25, 0.02, -0.40], toe: [0.34, 0.02, -0.18], yaw: -70 },
        footL: { ankle: [-0.08, 0.08, -0.02], heel: [-0.12, 0.02, -0.10], toe: [0.00, 0.02, 0.12], yaw: -35 },
        kneeR: [0.22, 0.50, -0.26], kneeL: [-0.06, 0.50, 0.04],
        hipR: [0.16, 0.94, -0.24], hipL: [-0.04, 0.94, -0.06],
        shR: [0.16, 1.40, -0.28], shL: [-0.04, 1.42, -0.02],
        elR: [0.24, 1.14, -0.42], wrR: [0.18, 0.96, -0.22], rTip: [0.12, 0.85, 0.15], rFaceNormal: [0.5, 0, 0.8],
        elL: [-0.08, 1.26, 0.18], wrL: [-0.06, 1.32, 0.36], head: [0.06, 1.66, -0.12], ball: [-0.06, 1.38, 0.38]
      },
      {
        t: 0.42, // Trophy Pose + Deep Knee Bend (118°)
        pelvisPos: [0.02, 0.78, -0.02], pelvisYaw: -70, chestYaw: -85, headYaw: -5,
        kneeBendDeg: 118, elbowAngleDeg: 90, contactOffsetCm: 15, weightR: 50, weightL: 50,
        footR: { ankle: [0.14, 0.08, -0.12], heel: [0.16, 0.02, -0.22], toe: [0.24, 0.02, 0.02], yaw: -65 },
        footL: { ankle: [-0.08, 0.08, -0.02], heel: [-0.12, 0.02, -0.10], toe: [0.00, 0.02, 0.12], yaw: -35 },
        kneeR: [0.20, 0.42, 0.06], kneeL: [-0.02, 0.42, 0.16],
        hipR: [0.12, 0.78, -0.08], hipL: [-0.06, 0.80, 0.06],
        shR: [0.18, 1.18, -0.22], shL: [-0.06, 1.34, 0.04],
        elR: [0.26, 1.18, -0.48], wrR: [0.24, 1.44, -0.46], rTip: [0.18, 1.88, -0.42], rFaceNormal: [0.8, 0.2, 0.5],
        elL: [-0.08, 1.66, 0.12], wrL: [-0.08, 1.96, 0.18], head: [0.04, 1.50, -0.04], ball: [-0.06, 2.55, 0.35]
      },
      {
        t: 0.64, // Airborne Contact Point at 2.75m height, 40cm inside court!
        pelvisPos: [0.00, 1.12, 0.24], pelvisYaw: 5, chestYaw: 15, headYaw: 0,
        kneeBendDeg: 174, elbowAngleDeg: 172, contactOffsetCm: 42, weightR: 0, weightL: 0,
        footR: { ankle: [0.16, 0.26, 0.05], heel: [0.16, 0.30, -0.04], toe: [0.16, 0.18, 0.14], yaw: -15 },
        footL: { ankle: [-0.10, 0.22, 0.22], heel: [-0.10, 0.26, 0.12], toe: [-0.10, 0.14, 0.32], yaw: 0 },
        kneeR: [0.14, 0.68, 0.14], kneeL: [-0.10, 0.66, 0.24],
        hipR: [0.12, 1.12, 0.22], hipL: [-0.12, 1.12, 0.26],
        shR: [0.16, 1.62, 0.28], shL: [-0.16, 1.48, 0.20],
        elR: [0.14, 1.96, 0.34], wrR: [0.08, 2.26, 0.40], rTip: [0.02, 2.76, 0.44], rFaceNormal: [0.0, -0.18, 0.98],
        elL: [-0.22, 1.24, 0.26], wrL: [-0.12, 1.08, 0.32], head: [0.02, 1.80, 0.26], ball: [0.02, 2.72, 0.48]
      },
      {
        t: 0.82, // Landing on Left Foot inside court (+0.45m)
        pelvisPos: [-0.04, 0.90, 0.42], pelvisYaw: 28, chestYaw: 42, headYaw: 5,
        kneeBendDeg: 136, elbowAngleDeg: 120, contactOffsetCm: 0, weightR: 10, weightL: 90,
        footR: { ankle: [0.18, 0.32, 0.02], heel: [0.18, 0.38, -0.08], toe: [0.18, 0.24, 0.10], yaw: 0 },
        footL: { ankle: [-0.12, 0.08, 0.45], heel: [-0.12, 0.02, 0.35], toe: [-0.12, 0.02, 0.58], yaw: 0 },
        kneeR: [0.16, 0.62, 0.20], kneeL: [-0.12, 0.48, 0.48],
        hipR: [0.10, 0.90, 0.38], hipL: [-0.14, 0.90, 0.44],
        shR: [0.10, 1.32, 0.52], shL: [-0.18, 1.34, 0.34],
        elR: [-0.06, 1.08, 0.56], wrR: [-0.24, 0.92, 0.42], rTip: [-0.42, 0.72, 0.18], rFaceNormal: [-0.8, -0.2, 0.5],
        elL: [-0.28, 1.12, 0.22], wrL: [-0.24, 1.02, 0.12], head: [-0.02, 1.56, 0.50], ball: [0.00, 1.35, 3.20]
      },
      {
        t: 1.00,
        pelvisPos: [0.00, 0.92, 0.35], pelvisYaw: 0, chestYaw: 0, headYaw: 0,
        kneeBendDeg: 142, elbowAngleDeg: 115, contactOffsetCm: 0, weightR: 50, weightL: 50,
        footR: { ankle: [0.24, 0.08, 0.35], heel: [0.24, 0.02, 0.25], toe: [0.24, 0.02, 0.48], yaw: 0 },
        footL: { ankle: [-0.24, 0.08, 0.35], heel: [-0.24, 0.02, 0.25], toe: [-0.24, 0.02, 0.48], yaw: 0 },
        kneeR: [0.24, 0.48, 0.42], kneeL: [-0.24, 0.48, 0.42],
        hipR: [0.14, 0.92, 0.35], hipL: [-0.14, 0.92, 0.35],
        shR: [0.18, 1.38, 0.36], shL: [-0.18, 1.38, 0.36],
        elR: [0.22, 1.14, 0.48], wrR: [0.04, 1.18, 0.58], rTip: [0.00, 1.40, 0.74], rFaceNormal: [0, 0, 1],
        elL: [-0.22, 1.14, 0.48], wrL: [-0.04, 1.18, 0.58], head: [0.00, 1.62, 0.38], ball: [0.00, 0.20, 5.50]
      }
    ],
    userKeyframes: [
      {
        t: 0.00,
        pelvisPos: [0.05, 0.98, -0.15], pelvisYaw: -45, chestYaw: -50, headYaw: -5,
        kneeBendDeg: 168, elbowAngleDeg: 140, contactOffsetCm: 0, weightR: 50, weightL: 50,
        footR: { ankle: [0.24, 0.08, -0.25], heel: [0.26, 0.02, -0.35], toe: [0.32, 0.02, -0.12], yaw: -50 },
        footL: { ankle: [-0.10, 0.08, -0.05], heel: [-0.12, 0.02, -0.15], toe: [-0.04, 0.02, 0.08], yaw: -20 },
        kneeR: [0.24, 0.52, -0.20], kneeL: [-0.08, 0.52, 0.00],
        hipR: [0.16, 0.98, -0.20], hipL: [-0.04, 0.98, -0.08],
        shR: [0.16, 1.42, -0.22], shL: [-0.04, 1.42, -0.04],
        elR: [0.22, 1.18, -0.32], wrR: [0.16, 1.02, -0.16], rTip: [0.10, 0.92, 0.14], rFaceNormal: [0.4, 0, 0.9],
        elL: [-0.08, 1.24, 0.12], wrL: [-0.06, 1.28, 0.28], head: [0.06, 1.68, -0.10], ball: [-0.06, 1.34, 0.30]
      },
      {
        t: 0.42, // Shallow knee bend (154°), low elbow
        pelvisPos: [0.04, 0.92, -0.12], pelvisYaw: -48, chestYaw: -55, headYaw: -5,
        kneeBendDeg: 154, elbowAngleDeg: 72, contactOffsetCm: 0, weightR: 55, weightL: 45,
        footR: { ankle: [0.24, 0.08, -0.25], heel: [0.26, 0.02, -0.35], toe: [0.32, 0.02, -0.12], yaw: -50 },
        footL: { ankle: [-0.10, 0.08, -0.05], heel: [-0.12, 0.02, -0.15], toe: [-0.04, 0.02, 0.08], yaw: -20 },
        kneeR: [0.24, 0.48, -0.14], kneeL: [-0.08, 0.48, 0.04],
        hipR: [0.16, 0.92, -0.18], hipL: [-0.04, 0.92, -0.06],
        shR: [0.18, 1.34, -0.20], shL: [-0.04, 1.38, -0.02],
        elR: [0.26, 1.16, -0.34], wrR: [0.22, 1.38, -0.30], rTip: [0.18, 1.74, -0.26], rFaceNormal: [0.7, 0.2, 0.6],
        elL: [-0.08, 1.56, 0.06], wrL: [-0.08, 1.78, 0.10], head: [0.06, 1.60, -0.08], ball: [-0.06, 2.38, 0.08]
      },
      {
        t: 0.64, // Grounded contact, bent arm (142°), no jump inside court
        pelvisPos: [0.02, 0.98, -0.06], pelvisYaw: 0, chestYaw: 5, headYaw: 5,
        kneeBendDeg: 166, elbowAngleDeg: 142, contactOffsetCm: 5, weightR: 35, weightL: 65,
        footR: { ankle: [0.24, 0.10, -0.22], heel: [0.26, 0.06, -0.32], toe: [0.30, 0.02, -0.10], yaw: -35 },
        footL: { ankle: [-0.10, 0.08, -0.04], heel: [-0.12, 0.02, -0.14], toe: [-0.04, 0.02, 0.08], yaw: -15 },
        kneeR: [0.22, 0.54, -0.14], kneeL: [-0.08, 0.54, 0.00],
        hipR: [0.14, 0.98, -0.08], hipL: [-0.10, 0.98, -0.04],
        shR: [0.16, 1.44, -0.04], shL: [-0.12, 1.40, -0.04],
        elR: [0.18, 1.72, 0.04], wrR: [0.10, 1.98, 0.08], rTip: [0.04, 2.38, 0.10], rFaceNormal: [0.1, 0.05, 0.98],
        elL: [-0.20, 1.18, 0.04], wrL: [-0.14, 1.06, 0.08], head: [0.02, 1.68, -0.02], ball: [0.02, 2.36, 0.12]
      },
      {
        t: 0.82,
        pelvisPos: [0.00, 0.96, -0.02], pelvisYaw: 12, chestYaw: 20, headYaw: 8,
        kneeBendDeg: 162, elbowAngleDeg: 118, contactOffsetCm: 0, weightR: 40, weightL: 60,
        footR: { ankle: [0.22, 0.08, -0.16], heel: [0.22, 0.02, -0.26], toe: [0.26, 0.02, -0.04], yaw: -20 },
        footL: { ankle: [-0.12, 0.08, 0.02], heel: [-0.12, 0.02, -0.08], toe: [-0.08, 0.02, 0.14], yaw: -5 },
        kneeR: [0.20, 0.52, -0.08], kneeL: [-0.10, 0.52, 0.06],
        hipR: [0.12, 0.96, -0.02], hipL: [-0.12, 0.96, -0.02],
        shR: [0.12, 1.40, 0.04], shL: [-0.14, 1.40, -0.04],
        elR: [-0.02, 1.16, 0.14], wrR: [-0.16, 1.02, 0.08], rTip: [-0.28, 0.86, -0.08], rFaceNormal: [-0.5, 0, 0.8],
        elL: [-0.22, 1.14, -0.02], wrL: [-0.18, 1.08, -0.04], head: [0.00, 1.64, 0.02], ball: [0.00, 1.25, 2.50]
      },
      {
        t: 1.00,
        pelvisPos: [0.00, 0.96, 0.00], pelvisYaw: 0, chestYaw: 0, headYaw: 0,
        kneeBendDeg: 162, elbowAngleDeg: 115, contactOffsetCm: 0, weightR: 50, weightL: 50,
        footR: { ankle: [0.22, 0.08, -0.04], heel: [0.22, 0.02, -0.14], toe: [0.24, 0.02, 0.08], yaw: 0 },
        footL: { ankle: [-0.22, 0.08, -0.04], heel: [-0.22, 0.02, -0.14], toe: [-0.24, 0.02, 0.08], yaw: 0 },
        kneeR: [0.22, 0.52, 0.00], kneeL: [-0.22, 0.52, 0.00],
        hipR: [0.14, 0.96, 0.00], hipL: [-0.14, 0.96, 0.00],
        shR: [0.18, 1.40, 0.00], shL: [-0.18, 1.40, 0.00],
        elR: [0.22, 1.16, 0.12], wrR: [0.04, 1.20, 0.22], rTip: [0.00, 1.40, 0.36], rFaceNormal: [0, 0, 1],
        elL: [-0.22, 1.16, 0.12], wrL: [-0.04, 1.20, 0.22], head: [0.00, 1.64, 0.02], ball: [0.00, 0.20, 4.50]
      }
    ]
  },

  backhand2h: {
    id: 'backhand2h',
    name: 'Двуручный бэкхенд (2H Backhand)',
    proName: 'Новак Джокович (ATP Эталон)',
    score: 7.9,
    subScores: { prep: 8.6, footwork: 8.1, loading: 7.7, contact: 7.4, follow: 7.9 },
    stanceTypePro: 'Закрытая / Нейтральная с широким шагом правой ногой вперёд',
    stanceTypeUser: 'Узкая база без шага через линию мяча',
    strengths: [
      'Плотный хват двумя руками и синхронный отвод плеч',
      'Стабильная плоскость струн в ударной зоне'
    ],
    top3Fixes: [
      {
        priority: 1,
        title: 'Слишком узкая база стоп и нехватка шага правой ногой в мяч',
        impact: 'Высокий приоритет (-18% устойчивости)',
        desc: 'Джокович шагает правой ногой по диагонали вперёд (ширина базы 78 см). Ваша база — 46 см, из-за чего корпус заваливается назад при ударе.',
        phaseKey: 'T2'
      },
      {
        priority: 2,
        title: 'Пассивная левая рука (Доминирование правой руки)',
        impact: 'Высокий приоритет',
        desc: 'В двуручном бэкхенде левая рука должна разгибаться и разгонять ракетку как леворукий форхенд (угол левого локтя 158° у Джоковича против 124° у вас).',
        phaseKey: 'T2'
      },
      {
        priority: 3,
        title: 'Остановка заднего бедра',
        impact: 'Средний приоритет',
        desc: 'Левое бедро и левая пятка должны проворачиваться вслед за ударом в фазе T3.',
        phaseKey: 'T3'
      }
    ],
    drills: [
      {
        name: 'Дрилл «Форхенд левой рукой у сетки»',
        duration: '8 мин · 40 ударов с хавкорта',
        desc: 'Возьмите ракетку за шейку только левой рукой и сыграйте 20 топспинов слева с шагом правой ногой вперёд, затем добавьте правую руку без зажатия.'
      },
      {
        name: 'Дрилл «Широкий выпад (Джокович-степ)»',
        duration: '10 мин · Работа по углам',
        desc: 'При каждом ударе слева ставьте правую стопу под 45° к сетке на ширину 1.5 плеч и удерживайте баланс 1 секунду после удара.'
      }
    ],
    phases: [
      { key: 'T0', t: 0.00, label: 'T0: Поворот плеч и Заступ правой ноги', short: 'T0: Поворот' },
      { key: 'T1', t: 0.40, label: 'T1: Опускание головки под мяч', short: 'T1: Опускание' },
      { key: 'T2', t: 0.62, label: 'T2: Двуручный контакт впереди правого бедра', short: 'T2: Контакт' },
      { key: 'T3', t: 0.80, label: 'T3: Проводка за правое плечо и Пивот', short: 'T3: Проводка' },
      { key: 'T4', t: 1.00, label: 'T4: Кросс-овер шаг возврата', short: 'T4: Рекавери' }
    ],
    proKeyframes: [
      {
        t: 0.00,
        pelvisPos: [-0.12, 0.90, -0.08], pelvisYaw: 55, chestYaw: 102, headYaw: 12,
        kneeBendDeg: 134, elbowAngleDeg: 130, contactOffsetCm: 0, weightR: 25, weightL: 75,
        footR: { ankle: [0.12, 0.08, 0.14], heel: [0.16, 0.02, 0.06], toe: [0.06, 0.02, 0.30], yaw: 25 },
        footL: { ankle: [-0.38, 0.08, -0.18], heel: [-0.42, 0.02, -0.26], toe: [-0.50, 0.02, -0.04], yaw: 72 },
        kneeR: [0.12, 0.48, 0.24], kneeL: [-0.40, 0.46, -0.06],
        hipR: [0.02, 0.90, -0.02], hipL: [-0.28, 0.90, -0.14],
        shR: [-0.06, 1.38, 0.12], shL: [-0.22, 1.36, -0.26],
        elR: [-0.28, 1.18, 0.02], wrR: [-0.42, 1.24, -0.28], rTip: [-0.52, 1.62, -0.58], rFaceNormal: [-0.6, 0.1, 0.8],
        elL: [-0.38, 1.14, -0.44], wrL: [-0.44, 1.22, -0.32], head: [-0.14, 1.60, -0.04], ball: [-0.48, 1.22, 1.80]
      },
      {
        t: 0.40,
        pelvisPos: [-0.08, 0.84, 0.04], pelvisYaw: 24, chestYaw: 68, headYaw: 8,
        kneeBendDeg: 126, elbowAngleDeg: 138, contactOffsetCm: 12, weightR: 50, weightL: 50,
        footR: { ankle: [0.18, 0.08, 0.24], heel: [0.20, 0.02, 0.14], toe: [0.14, 0.02, 0.40], yaw: 15 },
        footL: { ankle: [-0.38, 0.08, -0.16], heel: [-0.40, 0.04, -0.24], toe: [-0.48, 0.02, -0.02], yaw: 60 },
        kneeR: [0.18, 0.44, 0.34], kneeL: [-0.36, 0.44, 0.02],
        hipR: [0.06, 0.84, 0.10], hipL: [-0.24, 0.84, -0.02],
        shR: [-0.02, 1.30, 0.18], shL: [-0.24, 1.28, -0.12],
        elR: [-0.24, 1.06, 0.08], wrR: [-0.42, 0.88, -0.08], rTip: [-0.48, 0.62, -0.44], rFaceNormal: [-0.2, -0.6, 0.75],
        elL: [-0.42, 1.02, -0.18], wrL: [-0.44, 0.86, -0.10], head: [-0.10, 1.54, 0.06], ball: [-0.48, 1.00, 0.85]
      },
      {
        t: 0.62, // Contact Point out in front with straight left arm extension
        pelvisPos: [-0.02, 0.92, 0.16], pelvisYaw: -10, chestYaw: -16, headYaw: -4,
        kneeBendDeg: 130, elbowAngleDeg: 158, contactOffsetCm: 34, weightR: 82, weightL: 18,
        footR: { ankle: [0.18, 0.08, 0.26], heel: [0.20, 0.02, 0.16], toe: [0.14, 0.02, 0.42], yaw: 10 },
        footL: { ankle: [-0.34, 0.12, -0.06], heel: [-0.36, 0.14, -0.16], toe: [-0.36, 0.02, 0.06], yaw: 20 },
        kneeR: [0.16, 0.50, 0.34], kneeL: [-0.28, 0.48, 0.10],
        hipR: [0.12, 0.92, 0.14], hipL: [-0.18, 0.92, 0.18],
        shR: [0.10, 1.38, 0.12], shL: [-0.22, 1.36, 0.24],
        elR: [-0.14, 1.18, 0.36], wrR: [-0.44, 1.04, 0.50], rTip: [-0.82, 1.02, 0.54], rFaceNormal: [0.0, -0.12, 0.99],
        elL: [-0.36, 1.18, 0.38], wrL: [-0.46, 1.04, 0.50], head: [-0.04, 1.60, 0.20], ball: [-0.68, 1.04, 0.56]
      },
      {
        t: 0.80,
        pelvisPos: [0.00, 0.96, 0.22], pelvisYaw: -35, chestYaw: -52, headYaw: -10,
        kneeBendDeg: 145, elbowAngleDeg: 112, contactOffsetCm: 0, weightR: 75, weightL: 25,
        footR: { ankle: [0.18, 0.08, 0.26], heel: [0.20, 0.02, 0.16], toe: [0.14, 0.02, 0.42], yaw: 0 },
        footL: { ankle: [-0.26, 0.12, 0.12], heel: [-0.26, 0.14, 0.00], toe: [-0.26, 0.02, 0.24], yaw: -10 },
        kneeR: [0.16, 0.52, 0.30], kneeL: [-0.20, 0.50, 0.22],
        hipR: [0.14, 0.96, 0.16], hipL: [-0.14, 0.96, 0.26],
        shR: [0.18, 1.40, 0.08], shL: [-0.12, 1.42, 0.32],
        elR: [0.28, 1.44, 0.28], wrR: [0.26, 1.48, 0.18], rTip: [0.38, 1.62, -0.14], rFaceNormal: [0.7, -0.3, 0.6],
        elL: [0.08, 1.44, 0.38], wrL: [0.24, 1.46, 0.20], head: [-0.02, 1.64, 0.22], ball: [-0.15, 1.62, 2.35]
      },
      {
        t: 1.00,
        pelvisPos: [0.00, 0.92, 0.05], pelvisYaw: 0, chestYaw: 0, headYaw: 0,
        kneeBendDeg: 140, elbowAngleDeg: 115, contactOffsetCm: 0, weightR: 50, weightL: 50,
        footR: { ankle: [0.28, 0.08, 0.05], heel: [0.28, 0.02, -0.05], toe: [0.30, 0.02, 0.18], yaw: 0 },
        footL: { ankle: [-0.28, 0.08, 0.05], heel: [-0.28, 0.02, -0.05], toe: [-0.30, 0.02, 0.18], yaw: 0 },
        kneeR: [0.28, 0.48, 0.14], kneeL: [-0.28, 0.48, 0.14],
        hipR: [0.16, 0.92, 0.05], hipL: [-0.16, 0.92, 0.05],
        shR: [0.20, 1.38, 0.06], shL: [-0.20, 1.38, 0.06],
        elR: [0.22, 1.12, 0.22], wrR: [0.02, 1.16, 0.34], rTip: [0.00, 1.42, 0.52], rFaceNormal: [0, 0, 1],
        elL: [-0.22, 1.12, 0.22], wrL: [-0.02, 1.16, 0.34], head: [0.00, 1.62, 0.08], ball: [0.35, 1.18, 4.10]
      }
    ],
    userKeyframes: [
      {
        t: 0.00,
        pelvisPos: [-0.08, 0.98, -0.10], pelvisYaw: 30, chestYaw: 62, headYaw: 5,
        kneeBendDeg: 162, elbowAngleDeg: 108, contactOffsetCm: 0, weightR: 40, weightL: 60,
        footR: { ankle: [0.14, 0.08, -0.02], heel: [0.14, 0.02, -0.12], toe: [0.14, 0.02, 0.12], yaw: 10 },
        footL: { ankle: [-0.28, 0.08, -0.12], heel: [-0.28, 0.02, -0.22], toe: [-0.32, 0.02, 0.02], yaw: 35 },
        kneeR: [0.14, 0.52, 0.02], kneeL: [-0.28, 0.52, -0.06],
        hipR: [0.04, 0.98, -0.06], hipL: [-0.22, 0.98, -0.12],
        shR: [-0.02, 1.42, 0.02], shL: [-0.20, 1.42, -0.18],
        elR: [-0.18, 1.20, -0.04], wrR: [-0.28, 1.26, -0.22], rTip: [-0.34, 1.58, -0.44], rFaceNormal: [-0.5, 0.1, 0.8],
        elL: [-0.28, 1.18, -0.32], wrL: [-0.30, 1.24, -0.24], head: [-0.08, 1.66, -0.06], ball: [-0.48, 1.22, 1.80]
      },
      {
        t: 0.40,
        pelvisPos: [-0.06, 0.96, -0.08], pelvisYaw: 18, chestYaw: 42, headYaw: 5,
        kneeBendDeg: 158, elbowAngleDeg: 112, contactOffsetCm: 0, weightR: 45, weightL: 55,
        footR: { ankle: [0.16, 0.08, 0.02], heel: [0.16, 0.02, -0.08], toe: [0.16, 0.02, 0.16], yaw: 10 },
        footL: { ankle: [-0.28, 0.08, -0.12], heel: [-0.28, 0.02, -0.22], toe: [-0.32, 0.02, 0.02], yaw: 35 },
        kneeR: [0.16, 0.52, 0.06], kneeL: [-0.28, 0.52, -0.04],
        hipR: [0.06, 0.96, -0.04], hipL: [-0.20, 0.96, -0.10],
        shR: [0.02, 1.40, 0.06], shL: [-0.20, 1.40, -0.14],
        elR: [-0.16, 1.12, 0.02], wrR: [-0.30, 0.98, -0.12], rTip: [-0.34, 0.78, -0.36], rFaceNormal: [-0.3, -0.3, 0.9],
        elL: [-0.30, 1.10, -0.20], wrL: [-0.32, 0.98, -0.14], head: [-0.06, 1.64, -0.04], ball: [-0.48, 1.00, 0.85]
      },
      {
        t: 0.62,
        pelvisPos: [-0.04, 0.98, -0.04], pelvisYaw: 4, chestYaw: 0, headYaw: -15,
        kneeBendDeg: 160, elbowAngleDeg: 124, contactOffsetCm: -14, weightR: 52, weightL: 48,
        footR: { ankle: [0.16, 0.08, 0.04], heel: [0.16, 0.02, -0.06], toe: [0.16, 0.02, 0.18], yaw: 10 },
        footL: { ankle: [-0.28, 0.08, -0.12], heel: [-0.28, 0.02, -0.22], toe: [-0.32, 0.02, 0.02], yaw: 32 },
        kneeR: [0.16, 0.54, 0.08], kneeL: [-0.28, 0.54, -0.04],
        hipR: [0.08, 0.98, -0.02], hipL: [-0.20, 0.98, -0.06],
        shR: [0.08, 1.42, -0.02], shL: [-0.20, 1.42, -0.02],
        elR: [-0.10, 1.16, 0.08], wrR: [-0.34, 1.06, 0.14], rTip: [-0.62, 1.04, 0.14], rFaceNormal: [-0.12, 0.15, 0.97],
        elL: [-0.26, 1.16, 0.06], wrL: [-0.36, 1.06, 0.14], head: [-0.06, 1.66, 0.02], ball: [-0.52, 1.05, 0.16]
      },
      {
        t: 0.80,
        pelvisPos: [-0.04, 0.98, -0.02], pelvisYaw: -10, chestYaw: -22, headYaw: -18,
        kneeBendDeg: 162, elbowAngleDeg: 100, contactOffsetCm: 0, weightR: 54, weightL: 46,
        footR: { ankle: [0.16, 0.08, 0.04], heel: [0.16, 0.02, -0.06], toe: [0.16, 0.02, 0.18], yaw: 8 },
        footL: { ankle: [-0.28, 0.08, -0.10], heel: [-0.28, 0.02, -0.20], toe: [-0.30, 0.02, 0.04], yaw: 25 },
        kneeR: [0.16, 0.54, 0.08], kneeL: [-0.26, 0.54, -0.02],
        hipR: [0.10, 0.98, 0.00], hipL: [-0.18, 0.98, -0.04],
        shR: [0.12, 1.42, -0.04], shL: [-0.16, 1.42, 0.06],
        elR: [0.18, 1.34, 0.14], wrR: [0.14, 1.36, 0.10], rTip: [0.22, 1.46, -0.10], rFaceNormal: [0.5, 0.2, 0.8],
        elL: [-0.02, 1.34, 0.18], wrL: [0.12, 1.36, 0.12], head: [-0.04, 1.66, 0.02], ball: [-0.15, 1.60, 1.85]
      },
      {
        t: 1.00,
        pelvisPos: [-0.02, 0.98, -0.04], pelvisYaw: 0, chestYaw: 0, headYaw: 0,
        kneeBendDeg: 162, elbowAngleDeg: 112, contactOffsetCm: 0, weightR: 50, weightL: 50,
        footR: { ankle: [0.22, 0.08, -0.02], heel: [0.22, 0.02, -0.12], toe: [0.22, 0.02, 0.12], yaw: 0 },
        footL: { ankle: [-0.26, 0.08, -0.06], heel: [-0.26, 0.02, -0.16], toe: [-0.28, 0.02, 0.08], yaw: 10 },
        kneeR: [0.22, 0.54, 0.02], kneeL: [-0.26, 0.54, 0.00],
        hipR: [0.12, 0.98, -0.04], hipL: [-0.16, 0.98, -0.04],
        shR: [0.16, 1.42, -0.02], shL: [-0.18, 1.42, -0.02],
        elR: [0.20, 1.18, 0.12], wrR: [0.02, 1.20, 0.22], rTip: [0.00, 1.40, 0.36], rFaceNormal: [0, 0, 1],
        elL: [-0.20, 1.18, 0.12], wrL: [-0.02, 1.20, 0.22], head: [-0.02, 1.66, 0.00], ball: [0.35, 1.15, 3.50]
      }
    ]
  }
};

// Map aliases for additional stroke selectors (One-handed Backhand, Volley, Smash)
window.ACECUE_STROKES.forehand_fed = window.ACECUE_STROKES.forehand;
window.ACECUE_STROKES.serve_alcaraz = window.ACECUE_STROKES.serve;
window.ACECUE_STROKES.backhand_djok = window.ACECUE_STROKES.backhand2h;
window.ACECUE_STROKES.volley = Object.assign({}, window.ACECUE_STROKES.forehand, {
  id: 'volley',
  name: 'Удар с лёта (Forehand Volley)',
  proName: 'Стефанос Циципас / Брайаны (ATP Эталон)',
  score: 8.1
});
window.ACECUE_STROKES.smash = Object.assign({}, window.ACECUE_STROKES.serve, {
  id: 'smash',
  name: 'Смэш над головой (Overhead Smash)',
  proName: 'Новак Джокович / Карлос Алькарас (ATP Эталон)',
  score: 7.4
});
