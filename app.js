// Arena Irrigation Planner
// Simple static tool: HTML5 Canvas + JS, no backend required.

(function() {
  const arenaWidthInput = document.getElementById('arenaWidth');
  const arenaLengthInput = document.getElementById('arenaLength');
  const headTypeSelect = document.getElementById('headType');
  const customRadiusRow = document.getElementById('customRadiusRow');
  const customRadiusInput = document.getElementById('customRadius');
  const placementRadios = document.querySelectorAll('input[name="placementMode"]');

  const btnNoGo = document.getElementById('btnNoGo');
  const btnClearNoGo = document.getElementById('btnClearNoGo');
  const btnRecalc = document.getElementById('btnRecalc');
  const btnExport = document.getElementById('btnExport');
  const noGoStatus = document.getElementById('noGoStatus');

  const canvas = document.getElementById('arenaCanvas');
  const ctx = canvas.getContext('2d');

  const shoppingDiv = document.getElementById('shoppingContent');

  // Internal state
  let noGoMode = false;
  let noGoStart = null;
  let noGoAreas = []; // in arena coordinates: {x1,y1,x2,y2}
  let sprinklers = [];
  let coverageRadius = 145; // default ft

  let arenaWidthFt = parseFloat(arenaWidthInput.value);
  let arenaLengthFt = parseFloat(arenaLengthInput.value);

  function getPlacementMode() {
    for (const r of placementRadios) {
      if (r.checked) return r.value;
    }
    return 'corners';
  }

  function updateRadiusFromUI() {
    const v = headTypeSelect.value;
    if (v === 'custom') {
      customRadiusRow.style.display = 'flex';
      coverageRadius = parseFloat(customRadiusInput.value) || 145;
    } else {
      customRadiusRow.style.display = 'none';
      coverageRadius = parseFloat(v);
    }
  }

  headTypeSelect.addEventListener('change', () => {
    updateRadiusFromUI();
    recalcAndRender();
  });

  customRadiusInput.addEventListener('input', () => {
    updateRadiusFromUI();
    recalcAndRender();
  });

  arenaWidthInput.addEventListener('change', () => {
    arenaWidthFt = Math.max(20, parseFloat(arenaWidthInput.value) || 20);
    recalcAndRender();
  });

  arenaLengthInput.addEventListener('change', () => {
    arenaLengthFt = Math.max(20, parseFloat(arenaLengthInput.value) || 20);
    recalcAndRender();
  });

  placementRadios.forEach(r => {
    r.addEventListener('change', recalcAndRender);
  });

  // Coordinate conversion
  function getScale() {
    const padding = 30;
    const usableW = canvas.width - 2*padding;
    const usableH = canvas.height - 2*padding;
    const sx = usableW / arenaLengthFt;
    const sy = usableH / arenaWidthFt;
    const scale = Math.min(sx, sy);
    return { scale, padding };
  }

  function arenaToCanvas(pt) {
    const { scale, padding } = getScale();
    // Arena (0,0) bottom-left, canvas (0,0) top-left
    const x = padding + pt.x * scale;
    const y = canvas.height - padding - pt.y * scale;
    return { x, y };
  }

  function canvasToArena(pt) {
    const { scale, padding } = getScale();
    const xArena = (pt.x - padding) / scale;
    const yArena = (canvas.height - padding - pt.y) / scale;
    return { x: xArena, y: yArena };
  }

  // No-go drawing support
  canvas.addEventListener('click', (ev) => {
    const rect = canvas.getBoundingClientRect();
    const cx = ev.clientX - rect.left;
    const cy = ev.clientY - rect.top;
    const arenaPt = canvasToArena({ x: cx, y: cy });

    if (noGoMode) {
      if (!noGoStart) {
        noGoStart = arenaPt;
        noGoStatus.textContent = 'Click the opposite corner of the no-go area...';
      } else {
        noGoAreas.push({
          x1: Math.min(noGoStart.x, arenaPt.x),
          y1: Math.min(noGoStart.y, arenaPt.y),
          x2: Math.max(noGoStart.x, arenaPt.x),
          y2: Math.max(noGoStart.y, arenaPt.y)
        });
        noGoStart = null;
        noGoMode = false;
        noGoStatus.textContent = 'No-go area added.';
        recalcAndRender();
      }
    }
  });

  btnNoGo.addEventListener('click', () => {
    noGoMode = true;
    noGoStart = null;
    noGoStatus.textContent = 'No-go mode: click first corner on the arena.';
  });

  btnClearNoGo.addEventListener('click', () => {
    noGoAreas = [];
    noGoStart = null;
    noGoMode = false;
    noGoStatus.textContent = 'No-go areas cleared.';
    recalcAndRender();
  });

  btnRecalc.addEventListener('click', () => {
    recalcAndRender();
  });

  btnExport.addEventListener('click', () => {
    // Use browser print dialog with print CSS to export shopping section to PDF
    window.print();
  });

  function pointInNoGo(x, y) {
    return noGoAreas.some(r => x >= r.x1 && x <= r.x2 && y >= r.y1 && y <= r.y2);
  }

  function generateSprinklers() {
    sprinklers = [];
    const mode = getPlacementMode();
    const r = coverageRadius;

    if (mode === 'corners') {
      const corners = [
        { x: 0, y: 0 },
        { x: arenaLengthFt, y: 0 },
        { x: arenaLengthFt, y: arenaWidthFt },
        { x: 0, y: arenaWidthFt }
      ];
      for (const c of corners) {
        if (!pointInNoGo(c.x, c.y)) {
          sprinklers.push(c);
        }
      }
    } else {
      // Auto along perimeter: place heads along each side, spaced by ~1.4*radius.
      const spacing = r * 1.4;
      const sides = [
        { // bottom side (0,0) to (L,0)
          start: { x: 0, y: 0 },
          end: { x: arenaLengthFt, y: 0 },
          length: arenaLengthFt
        },
        { // right side (L,0) to (L,W)
          start: { x: arenaLengthFt, y: 0 },
          end: { x: arenaLengthFt, y: arenaWidthFt },
          length: arenaWidthFt
        },
        { // top side (L,W) to (0,W)
          start: { x: arenaLengthFt, y: arenaWidthFt },
          end: { x: 0, y: arenaWidthFt },
          length: arenaLengthFt
        },
        { // left side (0,W) to (0,0)
          start: { x: 0, y: arenaWidthFt },
          end: { x: 0, y: 0 },
          length: arenaWidthFt
        }
      ];

      sides.forEach(side => {
        const n = Math.max(2, Math.ceil(side.length / spacing));
        for (let i = 0; i < n; i++) {
          const t = i / (n - 1);
          const x = side.start.x + (side.end.x - side.start.x) * t;
          const y = side.start.y + (side.end.y - side.start.y) * t;
          if (!pointInNoGo(x, y)) {
            // Avoid duplicates near corners
            const tooClose = sprinklers.some(s => {
              const dx = s.x - x;
              const dy = s.y - y;
              return Math.sqrt(dx*dx + dy*dy) < 5; // within 5 ft considered same
            });
            if (!tooClose) {
              sprinklers.push({ x, y });
            }
          }
        }
      });
    }
  }

  function renderArena() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const { scale, padding } = getScale();

    // Draw arena rectangle
    const bl = arenaToCanvas({ x: 0, y: 0 });
    const tr = arenaToCanvas({ x: arenaLengthFt, y: arenaWidthFt });
    const w = tr.x - bl.x;
    const h = bl.y - tr.y;

    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.fillRect(bl.x, tr.y, w, h);
    ctx.strokeRect(bl.x, tr.y, w, h);

    // Axes labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '11px system-ui';
    ctx.fillText(`Length: ${arenaLengthFt.toFixed(0)} ft`, bl.x + w/2 - 40, tr.y - 6);
    ctx.save();
    ctx.translate(bl.x - 6, tr.y + h/2 + 40);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`Width: ${arenaWidthFt.toFixed(0)} ft`, 0, 0);
    ctx.restore();

    // Draw no-go areas (shaded)
    ctx.fillStyle = 'rgba(220,38,38,0.25)';
    ctx.strokeStyle = 'rgba(220,38,38,0.7)';
    ctx.lineWidth = 1;
    noGoAreas.forEach(r => {
      const c1 = arenaToCanvas({ x: r.x1, y: r.y1 });
      const c2 = arenaToCanvas({ x: r.x2, y: r.y2 });
      const rx = c1.x;
      const ry = c2.y;
      const rw = c2.x - c1.x;
      const rh = c1.y - c2.y;
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeRect(rx, ry, rw, rh);
    });

    // Draw sprinklers and coverage
    sprinklers.forEach(s => {
      const c = arenaToCanvas(s);
      const { scale } = getScale();
      const pixelRadius = coverageRadius * scale;

      // Coverage circle
      ctx.beginPath();
      ctx.fillStyle = 'rgba(37,99,235,0.12)';
      ctx.strokeStyle = 'rgba(37,99,235,0.25)';
      ctx.lineWidth = 1;
      ctx.arc(c.x, c.y, pixelRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Sprinkler point
      ctx.beginPath();
      ctx.fillStyle = '#2563eb';
      ctx.strokeStyle = '#1d4ed8';
      ctx.lineWidth = 1.5;
      ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }

  function buildShoppingList() {
    const headCount = sprinklers.length;
    const radius = coverageRadius;

    // Estimate perimeter mainline length around arena:
    const perimeter = 2 * (arenaWidthFt + arenaLengthFt);
    const mainlineLengthFt = perimeter * 1.05; // 5% extra for fittings

    // Assume one valve per head for this simple tool;
    // in reality you may group heads into zones.
    const valveCount = headCount;

    // Thrust blocks at each corner + each tee (assume one tee per head)
    const cornerBlocks = 4;
    const teeBlocks = valveCount;

    const items = [
      {
        category: 'Sprinklers & Valves',
        name: 'Big Gun sprinklers',
        qty: headCount,
        unit: 'ea',
        notes: 'E.g., Nelson 75 or 100 series, radius ≈ ' + radius.toFixed(0) + ' ft'
      },
      {
        category: 'Sprinklers & Valves',
        name: 'Control valves',
        qty: valveCount,
        unit: 'ea',
        notes: 'E.g., 3" electric irrigation valves (one per sprinkler)'
      },
      {
        category: 'Piping',
        name: 'Mainline pipe',
        qty: Math.ceil(mainlineLengthFt),
        unit: 'ft',
        notes: '4" PVC pressure pipe around arena perimeter (length includes 5% extra)'
      },
      {
        category: 'Piping',
        name: 'Mainline fittings',
        qty: 'as needed',
        unit: '',
        notes: '4" tees, elbows, reducers, couplings, unions'
      },
      {
        category: 'Structural',
        name: 'Thrust block concrete – corners',
        qty: cornerBlocks,
        unit: 'blocks',
        notes: 'Concrete blocks supporting each 90° corner'
      },
      {
        category: 'Structural',
        name: 'Thrust block concrete – tees',
        qty: teeBlocks,
        unit: 'blocks',
        notes: 'Concrete blocks behind each tee / riser'
      },
      {
        category: 'Controls & Pumping',
        name: 'Pump & VFD',
        qty: 1,
        unit: 'system',
        notes: 'Sized to supply one sprinkler at a time (flow & pressure per head spec)'
      },
      {
        category: 'Controls & Pumping',
        name: 'Control system (PLC + HMI)',
        qty: 1,
        unit: 'system',
        notes: 'Optional but recommended for safe automated sequencing'
      }
    ];

    let html = '';
    html += `<p><strong>Arena:</strong> ${arenaWidthFt.toFixed(0)} ft × ${arenaLengthFt.toFixed(0)} ft<br>`;
    html += `<strong>Sprinkler radius:</strong> ≈ ${radius.toFixed(0)} ft<br>`;
    html += `<strong>Sprinkler placement mode:</strong> ${getPlacementMode() === 'corners' ? 'Corners only' : 'Perimeter auto'}<br>`;
    html += `<strong>Number of sprinklers:</strong> ${headCount}</p>`;

    html += '<table><thead><tr><th>Category</th><th>Item</th><th>Quantity</th><th>Unit</th><th>Notes</th></tr></thead><tbody>';
    items.forEach(it => {
      html += `<tr>
        <td>${it.category}</td>
        <td>${it.name}</td>
        <td>${it.qty}</td>
        <td>${it.unit}</td>
        <td>${it.notes}</td>
      </tr>`;
    });
    html += '</tbody></table>';

    html += `<p style="font-size:0.8rem; color:#6b7280; margin-top:0.5rem;">
      This shopping list is a starting point only. Always verify sizing, material ratings, and safety with a qualified engineer or installer.
    </p>`;

    shoppingDiv.innerHTML = html;
  }

  function recalcAndRender() {
    updateRadiusFromUI();
    generateSprinklers();
    renderArena();
    buildShoppingList();
  }

  // Initial
  updateRadiusFromUI();
  generateSprinklers();
  renderArena();
  buildShoppingList();
})();