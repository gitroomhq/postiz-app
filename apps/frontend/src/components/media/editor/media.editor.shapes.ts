// Preset vectors for the shape menu. Every shape is filled #000000 so the SVG
// colour controls can recolour it. A click inserts this markup as a layer.

export type EditorShape = {
  id: string;
  name: string;
  markup: string;
};

const n = (v: number) => Math.round(v * 100) / 100;

const svg = (body: string, viewBox = '0 0 100 100') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`;

const fill = (d: string, viewBox?: string) => svg(`<path fill="#000000" d="${d}"/>`, viewBox);

const even = (d: string, viewBox?: string) =>
  svg(`<path fill="#000000" fill-rule="evenodd" d="${d}"/>`, viewBox);

const at = (cx: number, cy: number, rad: number, a: number): [number, number] => [
  cx + rad * Math.cos(a),
  cy + rad * Math.sin(a),
];

const closed = (pts: [number, number][]) =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${n(p[0])} ${n(p[1])}`).join('') + 'Z';

const poly = (sides: number, radius = 44, rotation = -Math.PI / 2) => {
  const pts: [number, number][] = [];
  for (let i = 0; i < sides; i++) {
    pts.push(at(50, 50, radius, rotation + (i * 2 * Math.PI) / sides));
  }
  return closed(pts);
};

const star = (points: number, outer = 46, inner = 20, rotation = -Math.PI / 2) => {
  const pts: [number, number][] = [];
  for (let i = 0; i < points * 2; i++) {
    pts.push(at(50, 50, i % 2 ? inner : outer, rotation + (i * Math.PI) / points));
  }
  return closed(pts);
};

const disk = (cx: number, cy: number, rad: number) =>
  `M${n(cx - rad)} ${n(cy)}a${n(rad)} ${n(rad)} 0 1 1 ${n(rad * 2)} 0a${n(rad)} ${n(rad)} 0 1 1 ${n(-rad * 2)} 0`;

const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
  `M${n(cx - rx)} ${n(cy)}a${n(rx)} ${n(ry)} 0 1 1 ${n(rx * 2)} 0a${n(rx)} ${n(ry)} 0 1 1 ${n(-rx * 2)} 0`;

const roundRect = (x: number, y: number, w: number, h: number, rad: number) => {
  const q = Math.min(rad, w / 2, h / 2);
  return `M${n(x + q)} ${n(y)}H${n(x + w - q)}A${n(q)} ${n(q)} 0 0 1 ${n(x + w)} ${n(y + q)}V${n(y + h - q)}A${n(q)} ${n(q)} 0 0 1 ${n(x + w - q)} ${n(y + h)}H${n(x + q)}A${n(q)} ${n(q)} 0 0 1 ${n(x)} ${n(y + h - q)}V${n(y + q)}A${n(q)} ${n(q)} 0 0 1 ${n(x + q)} ${n(y)}Z`;
};

// angles use y-down space: 0 is right, increasing moves clockwise
const ring = (a0: number, a1: number, outer: number, inner: number, cx = 50, cy = 50) => {
  const delta = a1 - a0;
  const sweep = delta > 0 ? 1 : 0;
  const large = Math.abs(delta) > Math.PI ? 1 : 0;
  const start = at(cx, cy, outer, a0);
  const end = at(cx, cy, outer, a1);
  const innerEnd = at(cx, cy, inner, a1);
  const innerStart = at(cx, cy, inner, a0);
  return `M${n(start[0])} ${n(start[1])}A${n(outer)} ${n(outer)} 0 ${large} ${sweep} ${n(end[0])} ${n(end[1])}L${n(innerEnd[0])} ${n(innerEnd[1])}A${n(inner)} ${n(inner)} 0 ${large} ${sweep ? 0 : 1} ${n(innerStart[0])} ${n(innerStart[1])}Z`;
};

const sector = (a0: number, a1: number, rad = 42, cx = 50, cy = 50) => {
  const delta = a1 - a0;
  const sweep = delta > 0 ? 1 : 0;
  const large = Math.abs(delta) > Math.PI ? 1 : 0;
  const start = at(cx, cy, rad, a0);
  const end = at(cx, cy, rad, a1);
  return `M${n(cx)} ${n(cy)}L${n(start[0])} ${n(start[1])}A${n(rad)} ${n(rad)} 0 ${large} ${sweep} ${n(end[0])} ${n(end[1])}Z`;
};

const gear = (teeth: number, outer = 46, root = 34, hole = 14) => {
  const pts: [number, number][] = [];
  const step = (2 * Math.PI) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = -Math.PI / 2 + i * step;
    pts.push(at(50, 50, root, a + step * 0.08));
    pts.push(at(50, 50, outer, a + step * 0.28));
    pts.push(at(50, 50, outer, a + step * 0.72));
    pts.push(at(50, 50, root, a + step * 0.92));
  }
  return closed(pts) + disk(50, 50, hole);
};

const sun = (teeth: number, outer = 46, inner = 30, hole = 12) => star(teeth, outer, inner) + disk(50, 50, hole);

const scallop = (bumps: number, base = 36, amp = 10) => {
  const steps = bumps * 16;
  const pts: [number, number][] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    pts.push(at(50, 50, base + amp * (0.5 + 0.5 * Math.cos(bumps * a)), a));
  }
  return closed(pts);
};

const plus = (arm = 36, thick = 12) => {
  const t = 50 - thick;
  const u = 50 + thick;
  const a = 50 - arm;
  const b = 50 + arm;
  return closed([
    [t, a],
    [u, a],
    [u, t],
    [b, t],
    [b, u],
    [u, u],
    [u, b],
    [t, b],
    [t, u],
    [a, u],
    [a, t],
    [t, t],
  ]);
};

const rotate = (d: string, turns: number) => {
  const pts = d
    .replace(/Z$/i, '')
    .split(/[ML]/)
    .filter(Boolean)
    .map((pair) => pair.trim().split(/\s+/).map(Number) as [number, number]);
  const ang = (turns * Math.PI) / 2;
  return closed(
    pts.map(([x, y]) => {
      const dx = x - 50;
      const dy = y - 50;
      return [50 + dx * Math.cos(ang) - dy * Math.sin(ang), 50 + dx * Math.sin(ang) + dy * Math.cos(ang)];
    })
  );
};

// outline of four overlapping circles, so a square hole can be cut from the middle
const quatrefoil = (rad: number, cx = 50, cy = 50) => {
  const centers: [number, number][] = [
    [cx, cy - rad],
    [cx + rad, cy],
    [cx, cy + rad],
    [cx - rad, cy],
  ];
  const pts: [number, number][] = [];
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let best = 0;
    for (const [lx, ly] of centers) {
      const ox = cx - lx;
      const oy = cy - ly;
      const b = 2 * (ox * dx + oy * dy);
      const c = ox * ox + oy * oy - rad * rad;
      const disc = b * b - 4 * c;
      if (disc < 0) {
        continue;
      }
      const t = (-b + Math.sqrt(disc)) / 2;
      if (t > best) {
        best = t;
      }
    }
    pts.push([cx + best * dx, cy + best * dy]);
  }
  return closed(pts);
};

const petals = (count: number, length = 40, spread = 0.7, spin = -Math.PI / 2) => {
  let d = '';
  for (let i = 0; i < count; i++) {
    const a = spin + (i * 2 * Math.PI) / count;
    const tip = at(50, 50, length, a);
    const c1 = at(50, 50, length * 0.72, a - spread);
    const c2 = at(50, 50, length * 0.72, a + spread);
    d += `M50 50Q${n(c1[0])} ${n(c1[1])} ${n(tip[0])} ${n(tip[1])}Q${n(c2[0])} ${n(c2[1])} 50 50Z`;
  }
  return d;
};

const blockArrow = (dir: 'right' | 'left' | 'up' | 'down') => {
  const right: [number, number][] = [
    [8, 34],
    [52, 34],
    [52, 16],
    [92, 50],
    [52, 84],
    [52, 66],
    [8, 66],
  ];
  const map: Record<typeof dir, (p: [number, number]) => [number, number]> = {
    right: (p) => p,
    left: ([x, y]) => [100 - x, y],
    down: ([x, y]) => [y, x],
    up: ([x, y]) => [y, 100 - x],
  };
  return closed(right.map(map[dir]));
};

const doubleArrow = (vertical = false) => {
  const pts: [number, number][] = [
    [6, 50],
    [28, 28],
    [28, 40],
    [72, 40],
    [72, 28],
    [94, 50],
    [72, 72],
    [72, 60],
    [28, 60],
    [28, 72],
  ];
  return closed(vertical ? pts.map(([x, y]) => [y, x]) : pts);
};

const barArrow = (left = false) => {
  const pts: [number, number][] = [
    [8, 38],
    [62, 38],
    [62, 20],
    [92, 50],
    [62, 80],
    [62, 62],
    [8, 62],
  ];
  return closed(left ? pts.map(([x, y]) => [100 - x, y]) : pts);
};

const dashes = (from: number, to: number, y: number, h: number, dash: number, gap: number) => {
  let d = '';
  for (let x = from; x < to - 0.5; x += dash + gap) {
    const w = Math.min(dash, to - x);
    d += closed([
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ]);
  }
  return d;
};

const dots = (xs: number[], y = 12, rad = 3.2) => xs.map((x) => disk(x, y, rad)).join('');

const head = (x: number, dir: 1 | -1, y = 12) =>
  closed([
    [x, y - 7],
    [x + dir * 14, y],
    [x, y + 7],
  ]);

const WAVE = '0 0 100 36';
const LINE = '0 0 140 24';

const wave = (cycles: number, amp: number, thick: number) => {
  const top: string[] = [];
  const bot: string[] = [];
  const steps = cycles * 2;
  for (let i = 0; i <= steps; i++) {
    const x = 6 + (88 * i) / steps;
    const y = 16 + (i % 2 ? amp : -amp);
    const c = i === 0 ? `M${n(x)} ${n(y)}` : `Q${n(x - 88 / steps / 2)} ${n(i % 2 ? 16 - amp : 16 + amp)} ${n(x)} ${n(y)}`;
    top.push(c);
    bot.push(
      i === 0
        ? `L${n(x)} ${n(y + thick)}`
        : `Q${n(x + 88 / steps / 2)} ${n((i % 2 ? 16 - amp : 16 + amp) + thick)} ${n(x)} ${n(y + thick)}`
    );
  }
  return top.join('') + bot.reverse().join('') + 'Z';
};

const heart = (lean = 0) =>
  `M${n(50 + lean)} 86C${n(28 + lean)} 70 ${n(8 + lean)} 56 ${n(10 + lean * 0.3)} 36C${n(12 + lean * 0.2)} 20 ${n(26)} 12 ${n(38)} 16C${n(44)} 18 ${n(48)} 26 ${n(50 + lean * 0.2)} 32C${n(52)} 26 ${n(56)} 18 ${n(62)} 16C${n(74)} 12 ${n(88)} 20 ${n(90 - lean * 0.2)} 36C${n(92 - lean * 0.3)} 56 ${n(72 + lean)} 70 ${n(50 + lean)} 86Z`;

const shape = (id: string, name: string, d: string, viewBox?: string): EditorShape => ({
  id,
  name,
  markup: fill(d, viewBox),
});

const holed = (id: string, name: string, d: string): EditorShape => ({
  id,
  name,
  markup: even(d),
});

export const editorShapes: EditorShape[] = [
  shape('square', 'Square', closed([[14, 14], [86, 14], [86, 86], [14, 86]])),
  shape('rounded-square', 'Rounded square', roundRect(14, 14, 72, 72, 16)),
  shape('circle', 'Circle', disk(50, 50, 38)),
  shape('triangle', 'Triangle', poly(3)),
  shape('triangle-down', 'Triangle down', poly(3, 44, Math.PI / 2)),
  shape('triangle-left', 'Triangle left', poly(3, 44, Math.PI)),
  shape('triangle-right', 'Triangle right', poly(3, 44, 0)),
  shape('diamond', 'Diamond', poly(4)),
  shape('plus', 'Plus', plus()),
  shape('pill', 'Pill', roundRect(10, 34, 80, 32, 16)),
  shape('rounded-rect', 'Rounded rectangle', roundRect(16, 22, 68, 56, 14)),
  shape('trapezoid', 'Trapezoid', closed([[22, 24], [78, 24], [92, 78], [8, 78]])),
  shape('trapezoid-wide', 'Wide trapezoid', closed([[8, 22], [92, 22], [76, 78], [24, 78]])),
  shape('arch', 'Arch', `M16 86V48A34 34 0 0 1 84 48V86Z`),
  shape('doorway', 'Doorway', `M18 16H62A28 28 0 0 1 62 84H18Z`),
  shape('right-triangle', 'Right triangle', closed([[16, 16], [16, 84], [84, 84]])),
  shape('semicircle', 'Semicircle', sector(Math.PI, Math.PI * 2, 36, 50, 66)),
  shape('quarter', 'Quarter circle', sector(-Math.PI / 2, 0, 70, 14, 86)),
  shape('quarter-ring', 'Quarter ring', ring(-Math.PI / 2, 0, 74, 48, 12, 88)),
  shape('arch-small', 'Small arch', ring(Math.PI, Math.PI * 2, 32, 18, 50, 68)),
  shape('pentagon', 'Pentagon', poly(5)),
  shape('hexagon', 'Hexagon', poly(6, 44, 0)),
  shape('heptagon', 'Heptagon', poly(7)),
  shape('octagon', 'Octagon', poly(8, 44, Math.PI / 8)),
  shape('octagon-point', 'Pointed octagon', poly(8)),
  shape('nonagon', 'Nonagon', poly(9)),

  shape('star-4', 'Four point star', star(4, 46, 16)),
  shape('star-5', 'Five point star', star(5, 46, 20)),
  shape('star-6', 'Six point star', star(6, 46, 24)),
  shape('badge-8', 'Eight point badge', star(8, 46, 34)),
  shape('badge-12', 'Twelve point badge', star(12, 46, 36)),
  shape('badge-16', 'Sun badge', star(16, 46, 36)),
  shape('burst', 'Burst', star(12, 46, 26)),
  shape('burst-dense', 'Dense burst', scallop(18, 34, 12)),
  shape('burst-fine', 'Fine burst', star(24, 46, 34)),
  shape('spark-4', 'Sparkle', star(4, 46, 6)),
  shape('spark-8', 'Eight point sparkle', star(8, 46, 8)),
  shape('spark-12', 'Twelve point sparkle', star(12, 46, 7)),
  shape('spark-16', 'Sixteen point sparkle', star(16, 46, 6)),
  shape('seal', 'Seal', scallop(24, 38, 8)),

  shape('ribbon', 'Ribbon', closed([[6, 32], [94, 32], [78, 50], [94, 68], [6, 68], [22, 50]])),
  shape('flag', 'Flag', closed([[12, 20], [78, 20], [58, 50], [78, 80], [12, 80]])),
  shape('bookmark', 'Bookmark', closed([[28, 12], [72, 12], [72, 88], [50, 68], [28, 88]])),
  shape('pennant', 'Pennant', closed([[24, 14], [76, 14], [50, 88]])),
  shape('banner', 'Banner', closed([[22, 12], [78, 12], [78, 88], [50, 64], [22, 88]])),

  holed('gear', 'Gear', gear(8)),
  holed('gear-wide', 'Wide gear', gear(10, 46, 36, 16)),
  holed('sun-gear', 'Sun gear', sun(12, 46, 28, 12)),
  holed('gear-fine', 'Fine gear', gear(12, 46, 36, 14)),
  holed('gear-bold', 'Bold gear', gear(6, 46, 32, 14)),
  holed('sun', 'Sun', sun(16, 46, 30, 14)),

  shape('asterisk', 'Asterisk', star(8, 44, 12)),
  shape('asterisk-6', 'Six point asterisk', star(6, 44, 10)),
  shape('cross', 'Cross', plus(32, 10)),
  shape('x', 'X', rotate(plus(32, 10), 0.5)),
  shape('asterisk-fat', 'Thick asterisk', star(8, 42, 18, Math.PI / 8)),

  holed('flower-6', 'Six petal flower', petals(6, 40, 0.62) + disk(50, 50, 10)),
  holed('flower-8', 'Eight petal flower', petals(8, 40, 0.45) + disk(50, 50, 9)),
  holed('flower-5', 'Five petal flower', petals(5, 42, 0.7) + disk(50, 50, 10)),
  holed('daisy', 'Daisy', petals(8, 38, 0.55) + disk(50, 50, 12)),
  shape('clover', 'Clover', disk(50, 28, 20) + disk(72, 50, 20) + disk(50, 72, 20) + disk(28, 50, 20)),
  shape('blossom', 'Blossom', petals(4, 42, 0.85)),

  shape('arrow-right', 'Arrow right', blockArrow('right')),
  shape('arrow-left', 'Arrow left', blockArrow('left')),
  shape('arrow-up', 'Arrow up', blockArrow('up')),
  shape('arrow-down', 'Arrow down', blockArrow('down')),
  shape('arrow-horizontal', 'Left right arrow', doubleArrow(false)),
  shape('arrow-vertical', 'Up down arrow', doubleArrow(true)),
  shape('arrow-bar-right', 'Arrow bar right', barArrow(false)),
  shape('arrow-bar-left', 'Arrow bar left', barArrow(true)),
  shape('arrow-both', 'Double arrow', closed([[18, 50], [34, 36], [34, 44], [66, 44], [66, 36], [82, 50], [66, 64], [66, 56], [34, 56], [34, 64]])),

  shape('hex-flat', 'Flat hexagon', closed([[10, 50], [28, 30], [72, 30], [90, 50], [72, 70], [28, 70]])),
  shape('stadium', 'Stadium', roundRect(12, 34, 76, 32, 16)),
  shape('soft-square', 'Soft square', roundRect(18, 22, 64, 56, 12)),
  shape('diamond-wide', 'Wide diamond', closed([[50, 28], [86, 50], [50, 72], [14, 50]])),
  shape('blob', 'Blob', `M18 42C18 28 30 18 46 20C58 8 82 16 84 34C96 40 94 64 80 70C74 84 52 86 40 76C24 80 12 64 18 42Z`),
  shape('parallelogram', 'Parallelogram', closed([[28, 20], [92, 20], [72, 80], [8, 80]])),
  shape('quarter-wide', 'Wide quarter', sector(Math.PI, Math.PI / 2, 70, 86, 16)),
  shape('wave', 'Wave', wave(2, 8, 8), WAVE),
  shape('wave-long', 'Long wave', wave(3, 6, 7), WAVE),
  shape('quatrefoil', 'Quatrefoil', disk(50, 30, 18) + disk(70, 50, 18) + disk(50, 70, 18) + disk(30, 50, 18) + disk(50, 50, 10)),
  shape('half-left', 'Left half', sector(Math.PI / 2, -Math.PI / 2, 36, 62, 50)),
  shape('half-right', 'Right half', sector(-Math.PI / 2, Math.PI / 2, 36, 38, 50)),
  shape('cup', 'Cup', closed([[16, 28], [84, 28], [70, 78], [30, 78]])),
  shape('tablet', 'Tablet', roundRect(18, 28, 64, 46, 8)),
  shape('triangle-bold', 'Bold triangle', poly(3, 40, Math.PI / 2)),
  shape('tag', 'Tag', closed([[14, 30], [62, 30], [88, 50], [62, 70], [14, 70], [28, 50]])),
  shape('shield', 'Shield', `M50 90L14 70V30L50 12L86 30V70Z`),
  shape('notch', 'Notched rectangle', closed([[16, 22], [84, 22], [84, 62], [50, 78], [16, 62]])),
  shape('folded', 'Folded corner', closed([[16, 16], [64, 16], [86, 38], [86, 84], [16, 84]])),
  shape('slice', 'Slice', closed([[18, 28], [82, 18], [78, 78], [22, 70]])),
  shape('petal-4', 'Four petals', petals(4, 44, 0.5, Math.PI / 4)),
  shape('spark-diamond', 'Diamond sparkle', star(4, 46, 10, Math.PI / 4)),
  holed('window', 'Window', quatrefoil(20) + roundRect(40, 40, 20, 20, 2)),

  shape('line', 'Line', closed([[4, 10], [136, 10], [136, 14], [4, 14]]), LINE),
  shape('line-dashed', 'Dashed line', dashes(4, 136, 10, 4, 14, 8), LINE),
  shape('line-dotted', 'Dotted line', dots([8, 24, 40, 56, 72, 88, 104, 120, 132], 12, 2.6), LINE),
  shape('line-arrow', 'Line arrow', closed([[4, 10], [108, 10], [108, 5], [132, 12], [108, 19], [108, 14], [4, 14]]), LINE),
  shape('line-arrow-both', 'Line arrow both', closed([[16, 5], [16, 10], [124, 10], [124, 5], [136, 12], [124, 19], [124, 14], [16, 14], [16, 19], [4, 12]]), LINE),
  shape('line-dashed-arrow', 'Dashed arrow', dashes(4, 108, 10, 4, 12, 8) + head(108, 1), LINE),
  shape('line-arrow-double', 'Double line arrow', head(4, 1) + closed([[18, 10], [122, 10], [122, 14], [18, 14]]) + head(122, 1), LINE),
  shape('line-dotted-arrow', 'Dotted arrow', dots([10, 26, 42, 58, 74, 90], 12, 2.4) + head(104, 1), LINE),
  shape('line-dots', 'Line with dots', disk(10, 12, 4) + closed([[18, 10.5], [122, 10.5], [122, 13.5], [18, 13.5]]) + disk(70, 12, 4) + disk(130, 12, 4), LINE),
  shape('line-squares', 'Line with squares', disk(10, 12, 3.5) + closed([[18, 10.5], [64, 10.5], [64, 13.5], [18, 13.5]]) + closed([[66, 6], [76, 6], [76, 18], [66, 18]]) + closed([[80, 10.5], [122, 10.5], [122, 13.5], [80, 13.5]]) + disk(130, 12, 3.5), LINE),

  shape('bubble', 'Speech bubble', roundRect(14, 12, 72, 50, 6) + closed([[28, 62], [22, 88], [52, 62]])),
  shape('bubble-round', 'Round speech bubble', roundRect(16, 14, 68, 46, 20) + closed([[40, 60], [36, 84], [62, 58]])),
  shape('thought', 'Thought bubble', disk(38, 36, 16) + disk(58, 30, 18) + disk(74, 42, 14) + disk(62, 54, 14) + disk(42, 54, 16) + disk(28, 74, 6) + disk(18, 86, 3.5)),
  shape('bubble-left', 'Left speech bubble', roundRect(18, 16, 68, 48, 8) + closed([[34, 64], [16, 86], [48, 64]])),
  shape('bubble-right', 'Right speech bubble', roundRect(14, 18, 70, 44, 18) + closed([[58, 62], [78, 86], [46, 62]])),

  shape('heart', 'Heart', heart(0)),
  shape('heart-round', 'Round heart', `M50 84C34 74 12 60 14 40C16 24 30 16 42 22C46 26 48 30 50 36C52 30 54 26 58 22C70 16 84 24 86 40C88 60 66 74 50 84Z`),
  shape('heart-wide', 'Wide heart', `M50 80C22 66 4 52 8 34C12 16 32 10 46 22C48 24 49 28 50 32C51 28 52 24 54 22C68 10 88 16 92 34C96 52 78 66 50 80Z`),
  shape('heart-tall', 'Tall heart', `M50 90C36 76 16 62 16 40C16 22 28 10 40 14C46 16 48 24 50 30C52 24 54 16 60 14C72 10 84 22 84 40C84 62 64 76 50 90Z`),
  shape('heart-lean', 'Leaning heart', heart(6)),

  shape('cloud', 'Cloud', disk(32, 58, 16) + disk(48, 46, 20) + disk(68, 50, 18) + disk(78, 62, 12) + ellipse(54, 64, 28, 14)),
  shape('cloud-small', 'Small cloud', disk(36, 54, 14) + disk(54, 46, 16) + disk(70, 56, 12) + ellipse(52, 60, 24, 12)),
  shape('cloud-wide', 'Wide cloud', disk(24, 52, 14) + disk(42, 42, 18) + disk(62, 40, 16) + disk(80, 50, 14) + ellipse(52, 58, 36, 14)),
  shape('cloud-flat', 'Flat cloud', ellipse(50, 56, 36, 16) + disk(30, 50, 14) + disk(50, 42, 16) + disk(72, 50, 14)),
  shape('cloud-puff', 'Puff cloud', disk(34, 58, 18) + disk(54, 44, 22) + disk(74, 56, 16) + disk(58, 64, 16)),
];
