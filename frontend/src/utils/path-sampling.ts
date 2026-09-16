export type Point = [number, number];

/**
 * Calculates euclidean distance between two points.
 */
export function distance(p1: Point, p2: Point): number {
  const dx = p1[0] - p2[0];
  const dy = p1[1] - p2[1];
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Computes cumulative arc length of a sequence of points.
 */
export function computeCumulativeLengths(points: Point[]): number[] {
  const cumLengths = [0];
  for (let i = 1; i < points.length; i++) {
    const d = distance(points[i - 1], points[i]);
    cumLengths.push(cumLengths[i - 1] + d);
  }
  return cumLengths;
}

/**
 * Uniformly resamples a path into exactly `targetCount` equidistant points along its arc length.
 * Closes the loop cleanly by connecting the end to the start.
 */
export function resamplePath(points: Point[], targetCount = 200): Point[] {
  if (points.length < 2) return points;

  // Make a closed copy if not already closed
  const closed = [...points];
  const first = closed[0];
  const last = closed[closed.length - 1];
  if (distance(first, last) > 1e-4) {
    closed.push([first[0], first[1]]);
  }

  const cum = computeCumulativeLengths(closed);
  const totalLength = cum[cum.length - 1];

  if (totalLength <= 0) return points;

  const resampled: Point[] = [];
  const step = totalLength / targetCount;

  let currentIdx = 0;
  for (let i = 0; i < targetCount; i++) {
    const targetDist = i * step;

    while (currentIdx < cum.length - 2 && cum[currentIdx + 1] < targetDist) {
      currentIdx++;
    }

    const segStartDist = cum[currentIdx];
    const segEndDist = cum[currentIdx + 1];
    const segLength = segEndDist - segStartDist;

    if (segLength <= 0) {
      resampled.push(closed[currentIdx]);
    } else {
      const alpha = (targetDist - segStartDist) / segLength;
      const p1 = closed[currentIdx];
      const p2 = closed[currentIdx + 1];
      const x = p1[0] + alpha * (p2[0] - p1[0]);
      const y = p1[1] + alpha * (p2[1] - p1[1]);
      resampled.push([x, y]);
    }
  }

  return resampled;
}

/**
 * Centers and scales a set of points to fit nicely within a target width/height bounding box.
 */
export function normalizePoints(
  points: Point[],
  targetWidth = 400,
  targetHeight = 400,
  padding = 40
): Point[] {
  if (points.length === 0) return [];

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);

  const availWidth = targetWidth - 2 * padding;
  const availHeight = targetHeight - 2 * padding;

  const scale = Math.min(availWidth / width, availHeight / height);

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const outCenterX = targetWidth / 2;
  const outCenterY = targetHeight / 2;

  return points.map(([x, y]) => [
    outCenterX + (x - centerX) * scale,
    outCenterY + (y - centerY) * scale,
  ]);
}

/**
 * Built-in preset shapes: Star, Heart, Spiral, Trefoil.
 */
export function getPresetPath(preset: 'star' | 'heart' | 'spiral' | 'trefoil', numPoints = 200): Point[] {
  const points: Point[] = [];

  if (preset === 'star') {
    const arms = 5;
    const rOuter = 140;
    const rInner = 60;
    const totalVertices = arms * 2;
    for (let i = 0; i < totalVertices; i++) {
      const angle = (i * Math.PI) / arms - Math.PI / 2;
      const r = i % 2 === 0 ? rOuter : rInner;
      points.push([200 + r * Math.cos(angle), 200 + r * Math.sin(angle)]);
    }
    return resamplePath(points, numPoints);
  }

  if (preset === 'heart') {
    for (let i = 0; i < numPoints; i++) {
      const t = (i / numPoints) * 2 * Math.PI;
      // Parametric heart formula
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      points.push([200 + x * 9, 210 + y * 9]);
    }
    return points;
  }

  if (preset === 'spiral') {
    // Closed dual-spiral lobe loop
    for (let i = 0; i < numPoints; i++) {
      const t = (i / numPoints) * 2 * Math.PI;
      const r = 120 * (1 + 0.35 * Math.sin(3 * t) + 0.2 * Math.cos(5 * t));
      points.push([200 + r * Math.cos(t), 200 + r * Math.sin(t)]);
    }
    return points;
  }

  if (preset === 'trefoil') {
    for (let i = 0; i < numPoints; i++) {
      const t = (i / numPoints) * 2 * Math.PI;
      const r = 70 * (2 + Math.cos(3 * t));
      points.push([200 + r * Math.cos(2 * t), 200 + r * Math.sin(2 * t)]);
    }
    return points;
  }

  return points;
}
