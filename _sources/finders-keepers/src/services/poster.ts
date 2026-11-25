import type { BadgeId, RoomState, ScoreBreakdown } from '../types/game';
import { formatDistance } from '../game/geo';
import { BADGE_DEFINITIONS } from '../game/rules';

/**
 * Generates a vertical 9:16 (1080x1920) tactical Story Poster onto a canvas element
 * branded with the Finders Keepers chasing-figures badge, color-coded GPS trails,
 * MVP callout, survival/tag metrics, and unlocked badges.
 */
export function renderStoryPoster(
  canvas: HTMLCanvasElement,
  room: RoomState,
  scores: ScoreBreakdown[],
  unlockedBadges: BadgeId[]
): void {
  const W = 1080;
  const H = 1920;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 1. Tactical Dark Canvas Background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#0D101B');
  bgGrad.addColorStop(0.5, '#09090E');
  bgGrad.addColorStop(1, '#0C0F18');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Subtle tactical coordinate grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
  ctx.lineWidth = 2;
  for (let x = 90; x < W; x += 90) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 90; y < H; y += 90) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // 2. Top Brand Header with Chasing-Figures Tactical Emblem
  drawChasingEmblem(ctx, 84, 92, 92);

  ctx.fillStyle = '#F4F5F9';
  ctx.font = '800 58px "Barlow Condensed", sans-serif';
  ctx.fillText('FINDERS KEEPERS', 196, 146);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '600 26px "Plus Jakarta Sans", sans-serif';
  const modeLabel = room.settings.mode.toUpperCase();
  ctx.fillText(`FIELD DEBRIEF  ·  ${modeLabel}  ·  ROOM ${room.code}`, 198, 184);

  // 3. Winner Headline Banner
  const winnerAccent =
    room.winner === 'runners'
      ? '#10B981'
      : room.winner === 'hunters'
      ? '#EF4444'
      : '#F59E0B';
  const winnerText =
    room.winner === 'runners'
      ? 'RUNNERS ESCAPED'
      : room.winner === 'hunters'
      ? 'HUNTERS CLEAN SWEEP'
      : room.winner === 'imposters'
      ? 'IMPOSTERS PREVAILED'
      : 'ROUND COMPLETE';

  ctx.fillStyle = winnerAccent;
  ctx.font = '800 92px "Barlow Condensed", sans-serif';
  ctx.fillText(winnerText, 84, 306);

  if (room.winReason) {
    ctx.fillStyle = '#CBD5E1';
    ctx.font = '500 30px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(room.winReason.slice(0, 56), 84, 354);
  }

  // 4. Stylized GPS Breadcrumb Trail Map Box
  const mapX = 84;
  const mapY = 404;
  const mapW = W - 168;
  const mapH = 740;

  roundRect(ctx, mapX, mapY, mapW, mapH, 32);
  ctx.fillStyle = '#111421';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Concentric radar rings inside map frame
  const mapCx = mapX + mapW / 2;
  const mapCy = mapY + mapH / 2;
  ctx.save();
  roundRect(ctx, mapX, mapY, mapW, mapH, 32);
  ctx.clip();

  [140, 260, 380].forEach((r) => {
    ctx.beginPath();
    ctx.arc(mapCx, mapCy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // Collect all GPS coordinates to normalize trail bounds
  const allPts = room.players.flatMap((p) => p.trail);
  const refCenter = room.currentZone.center;
  const lats = allPts.length > 0 ? allPts.map((p) => p.lat) : [refCenter.lat];
  const lngs = allPts.length > 0 ? allPts.map((p) => p.lng) : [refCenter.lng];
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = Math.max(0.0025, maxLat - minLat);
  const lngSpan = Math.max(0.0025, maxLng - minLng);
  const pad = 76;

  const project = (lat: number, lng: number): [number, number] => {
    const nx = (lng - minLng) / lngSpan;
    const ny = 1 - (lat - minLat) / latSpan;
    return [mapX + pad + nx * (mapW - pad * 2), mapY + pad + ny * (mapH - pad * 2)];
  };

  // Draw active zone outline approximation
  ctx.beginPath();
  ctx.arc(mapCx, mapCy, Math.min(mapW, mapH) * 0.39, 0, Math.PI * 2);
  ctx.setLineDash([14, 12]);
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.setLineDash([]);

  // Render each player's GPS trail
  for (const player of room.players) {
    if (player.trail.length === 0) continue;
    ctx.beginPath();
    player.trail.forEach((pt, idx) => {
      const [px, py] = project(pt.lat, pt.lng);
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.strokeStyle = player.color;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // End dot
    const last = player.trail[player.trail.length - 1];
    const [ex, ey] = project(last.lat, last.lng);
    ctx.beginPath();
    ctx.arc(ex, ey, 11, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#09090E';
    ctx.stroke();
  }

  // Map legend strip inside bottom of map box
  ctx.fillStyle = 'rgba(9, 9, 14, 0.8)';
  ctx.fillRect(mapX, mapY + mapH - 64, mapW, 64);
  ctx.fillStyle = '#94A3B8';
  ctx.font = '600 22px "JetBrains Mono", monospace';
  ctx.fillText(
    `GPS TRAILS RECORDED: ${allPts.length} PTS   ·   TAGS: ${room.tags.length}   ·   PINGS: ${room.pings.length}`,
    mapX + 28,
    mapY + mapH - 24
  );
  ctx.restore();

  // 5. MVP & Top Performers Card
  const mvp = scores[0];
  const mvpY = 1188;
  roundRect(ctx, 84, mvpY, W - 168, 224, 28);
  ctx.fillStyle = '#131624';
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#F59E0B';
  ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('MATCH MVP', 124, mvpY + 52);

  ctx.fillStyle = '#F4F5F9';
  ctx.font = '800 62px "Barlow Condensed", sans-serif';
  ctx.fillText((mvp?.playerName ?? 'AGENT').toUpperCase(), 124, mvpY + 122);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '600 28px "JetBrains Mono", monospace';
  const mvpSummary = mvp
    ? `${mvp.points} PTS  ·  ${formatDistance(mvp.distanceMeters, room.settings.units)}  ·  ${
        mvp.initialRole === 'hunter'
          ? `${mvp.tagsCount} TAGS`
          : `${mvp.survivalMinutes} MIN SURVIVED`
      }`
    : 'FIELD READY';
  ctx.fillText(mvpSummary, 124, mvpY + 178);

  // 6. 3-Column Metric Row
  const totalDist = scores.reduce((sum, s) => sum + s.distanceMeters, 0);
  const statsY = 1448;
  const colW = (W - 168 - 40) / 3;
  const statItems = [
    { label: 'COMBINED DISTANCE', value: formatDistance(totalDist, room.settings.units) },
    { label: 'TOTAL TAGS', value: String(room.tags.length) },
    { label: 'PLAYERS', value: String(room.players.length) },
  ];

  statItems.forEach((item, idx) => {
    const sx = 84 + idx * (colW + 20);
    roundRect(ctx, sx, statsY, colW, 158, 24);
    ctx.fillStyle = '#11131E';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(item.label, sx + 26, statsY + 52);

    ctx.fillStyle = '#F4F5F9';
    ctx.font = '800 56px "Barlow Condensed", sans-serif';
    ctx.fillText(item.value, sx + 26, statsY + 120);
  });

  // 7. Earned Badges Strip
  const badgeY = 1648;
  ctx.fillStyle = '#94A3B8';
  ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('CAREER BADGES EARNED', 84, badgeY);

  const badgeNames = unlockedBadges
    .slice(0, 4)
    .map((id) => BADGE_DEFINITIONS.find((b) => b.id === id)?.name ?? id);
  ctx.fillStyle = '#10B981';
  ctx.font = '700 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    badgeNames.length > 0 ? badgeNames.join('  ·  ') : 'First Deployment',
    84,
    badgeY + 46
  );

  // 8. Bottom Watermark Bar
  ctx.strokeStyle = 'rgba(255,255,255,0.09)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(84, 1780);
  ctx.lineTo(W - 84, 1780);
  ctx.stroke();

  drawChasingEmblem(ctx, 84, 1806, 56);
  ctx.fillStyle = '#F4F5F9';
  ctx.font = '700 32px "Barlow Condensed", sans-serif';
  ctx.fillText('FINDERS KEEPERS  ·  REAL-WORLD GPS MANHUNT', 156, 1844);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawChasingEmblem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  ctx.save();
  ctx.translate(x, y);
  const s = size / 512;
  ctx.scale(s, s);

  roundRect(ctx, 0, 0, 512, 512, 112);
  ctx.fillStyle = '#000000';
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#2A2F42';
  ctx.stroke();

  const drawStickRunner = (ox: number, oy: number, sc: number) => {
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(sc, sc);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 5.0;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Hollow circle head
    ctx.beginPath();
    ctx.arc(28, 14, 9.5, 0, Math.PI * 2);
    ctx.stroke();

    // Torso, arms, legs with foot ticks
    ctx.beginPath();
    ctx.moveTo(34, 23);
    ctx.lineTo(43, 36);
    ctx.lineTo(48, 47);

    ctx.moveTo(34, 23);
    ctx.lineTo(20, 37);
    ctx.lineTo(9, 21);

    ctx.moveTo(34, 23);
    ctx.lineTo(51, 24);
    ctx.lineTo(67, 33);

    ctx.moveTo(48, 47);
    ctx.lineTo(22, 86);
    ctx.lineTo(18, 82.5);

    ctx.moveTo(48, 47);
    ctx.lineTo(65, 62);
    ctx.lineTo(83, 48);
    ctx.lineTo(84.5, 52.5);
    ctx.stroke();
    ctx.restore();
  };

  drawStickRunner(34, 148, 2.22);
  drawStickRunner(264, 148, 2.22);

  ctx.restore();
}

export async function shareOrDownloadPoster(
  canvas: HTMLCanvasElement,
  roomCode: string
): Promise<'shared' | 'downloaded'> {
  const filename = `finders-keepers-${roomCode.toLowerCase()}.png`;
  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/png', 0.95)
  );
  if (!blob) return 'downloaded';

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      const file = new File([blob], filename, { type: 'image/png' });
      const navWithCanShare = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
      };
      if (!navWithCanShare.canShare || navWithCanShare.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Finders Keepers — Field Debrief',
          text: `Finders Keepers match recap (${roomCode})`,
          files: [file],
        });
        return 'shared';
      }
    } catch {
      // User cancelled or share failed; fall back to PNG download
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
