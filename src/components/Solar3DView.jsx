import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function project(x, y, z, yaw, originX, originY, scale) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const rx = x * c - y * s;
  const ry = x * s + y * c;
  const isoX = (rx - ry) * 0.866;
  const isoY = (rx + ry) * 0.5 - z;
  return [originX + isoX * scale, originY + isoY * scale];
}

function drawQuad(ctx, pts, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function face(ctx, a, b, c, d, fill, stroke) {
  drawQuad(ctx, [a, b, c, d], fill, stroke);
}

export const Solar3DView = forwardRef(function Solar3DView({ form, result, playing = true }, ref) {
  const canvasRef = useRef(null);
  const yawRef = useRef(0.55);
  const rafRef = useRef(0);

  function paint(yaw) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#7ec8f5');
    sky.addColorStop(0.55, '#cfefff');
    sky.addColorStop(1, '#e8f5e9');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    const ox = w * 0.5;
    const oy = h * 0.62;
    const scale = Math.min(w, h) / 18;
    const p = (x, y, z) => project(x, y, z, yaw, ox, oy, scale);

    const length = Number(form?.length_m) || 12;
    const width = Number(form?.width_m) || 8;
    const tilt = clamp(Number(form?.tilt) || 18, 0, 45);
    const tankH = Number(form?.tank_height_m) || 0;
    const count = result?.system?.panel_count || 0;
    const portrait = (form?.orientation || 'portrait') !== 'landscape';

    const maxDim = Math.max(length, width, 8);
    const L = (length / maxDim) * 8;
    const W = (width / maxDim) * 8;
    const wall = 2.4;
    const roofRise = Math.tan((tilt * Math.PI) / 180) * W;

    const g = [
      p(-10, -10, 0), p(10, -10, 0), p(10, 10, 0), p(-10, 10, 0),
    ];
    drawQuad(ctx, g, '#9ccc65', '#7cb342');

    for (let i = -8; i <= 8; i += 2) {
      ctx.beginPath();
      ctx.moveTo(...p(i, -9, 0.01));
      ctx.lineTo(...p(i, 9, 0.01));
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.stroke();
    }

    const bl = p(-L / 2, -W / 2, 0);
    const br = p(L / 2, -W / 2, 0);
    const fr = p(L / 2, W / 2, 0);
    const fl = p(-L / 2, W / 2, 0);
    const tl = p(-L / 2, -W / 2, wall);
    const tr = p(L / 2, -W / 2, wall);
    const tfr = p(L / 2, W / 2, wall);
    const tfl = p(-L / 2, W / 2, wall);

    face(ctx, fl, fr, tfr, tfl, '#eceff1', '#90a4ae');
    face(ctx, br, fr, tfr, tr, '#cfd8dc', '#90a4ae');
    face(ctx, bl, br, tr, tl, '#b0bec5', '#78909c');

    const rl = p(-L / 2, -W / 2, wall + roofRise);
    const rr = p(L / 2, -W / 2, wall + roofRise);
    const rfl = p(-L / 2, W / 2, wall);
    const rfr = p(L / 2, W / 2, wall);
    face(ctx, rl, rr, rfr, rfl, '#8d6e63', '#5d4037');

    const cols = Math.max(1, portrait ? Math.round(L / 0.95) : Math.round(L / 1.7));
    const rows = Math.max(1, count ? Math.ceil(count / cols) : Math.round(W / (portrait ? 1.7 : 0.95)));
    const used = count || rows * cols;
    const gap = 0.08;
    const cellW = (L - gap * (cols + 1)) / cols;
    const cellH = (W - gap * (rows + 1)) / rows;
    let n = 0;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        if (n >= used) break;
        const x0 = -L / 2 + gap + c * (cellW + gap);
        const x1 = x0 + cellW;
        const y0 = -W / 2 + gap + r * (cellH + gap);
        const y1 = y0 + cellH;
        const t0 = wall + roofRise * (0.5 - y0 / W);
        const t1 = wall + roofRise * (0.5 - y1 / W);
        const zLift = 0.08;
        face(
          ctx,
          p(x0, y0, t0 + zLift),
          p(x1, y0, t0 + zLift),
          p(x1, y1, t1 + zLift),
          p(x0, y1, t1 + zLift),
          n % 3 === 0 ? '#0d47a1' : '#1565c0',
          '#0b3d91',
        );
        n += 1;
      }
    }

    if (tankH > 0) {
      const tw = 0.9;
      const th = Math.min(tankH, 4);
      const tx = L / 2 - 1.2;
      const ty = -W / 2 + 1.1;
      const b1 = p(tx, ty, wall);
      const b2 = p(tx + tw, ty, wall);
      const b3 = p(tx + tw, ty + tw, wall);
      const b4 = p(tx, ty + tw, wall);
      const t1 = p(tx, ty, wall + th);
      const t2 = p(tx + tw, ty, wall + th);
      const t3 = p(tx + tw, ty + tw, wall + th);
      const t4 = p(tx, ty + tw, wall + th);
      face(ctx, b4, b3, t3, t4, '#90caf9', '#1565c0');
      face(ctx, b2, b3, t3, t2, '#64b5f6', '#1565c0');
      face(ctx, t1, t2, t3, t4, '#bbdefb', '#1565c0');
    }

    const sunA = yaw + 0.9;
    const sun = p(Math.cos(sunA) * 9, Math.sin(sunA) * 9, 7.5);
    ctx.beginPath();
    ctx.arc(sun[0], sun[1], 14, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd54f';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sun[0], sun[1], 22, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,213,79,0.28)';
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = '600 22px Inter, Roboto, sans-serif';
    ctx.fillText(result?.system ? `${result.system.dc_kw} kWp · ${result.system.panel_count} modules` : '3D rooftop view', 16, 32);
    ctx.font = '16px Inter, Roboto, sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText(`Tilt ${tilt}° · ${form?.orientation || 'portrait'} · ${length}×${width} m`, 16, 56);
  }

  useImperativeHandle(ref, () => ({
    snapshot() {
      paint(0.72);
      return canvasRef.current?.toDataURL('image/jpeg', 0.92) || '';
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const resize = () => {
      const width = Math.max(320, parent?.clientWidth || 360);
      canvas.width = width * 2;
      canvas.height = Math.round(width * 1.15);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${Math.round(width * 0.575)}px`;
      paint(yawRef.current);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [form, result]);

  useEffect(() => {
    if (!playing) return undefined;
    let last = performance.now();
    const tick = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      yawRef.current += dt * 0.35;
      paint(yawRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, form, result]);

  return (
    <div className="solar3d-wrap">
      <canvas ref={canvasRef} className="solar3d-canvas" />
      <p className="muted solar3d-cap">Live 3D rooftop orbit — panels auto-laid from simulate</p>
    </div>
  );
});

export default Solar3DView;
