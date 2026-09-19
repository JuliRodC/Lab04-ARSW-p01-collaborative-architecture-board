/**
 * BoardView — proyección del estado a SVG + captura de eventos.
 * No tiene reglas de negocio ni de persistencia: recibe un snapshot, lo dibuja
 * y notifica intenciones (select / move / connectTarget) mediante handlers.
 * Lo único que recuerda es el último snapshot dibujado (para calcular el
 * arrastre) y el arrastre en curso, que es estado transitorio de interacción.
 */
const NS = 'http://www.w3.org/2000/svg';

function svgEl(name, attrs = {}) {
  const el = document.createElementNS(NS, name);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

const center = (e) => ({ x: e.x + e.width / 2, y: e.y + e.height / 2 });
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

export function createBoardView(canvas) {
  let handlers = { select: () => {}, move: () => {}, connectTarget: () => {} };
  let current = null; // último snapshot dibujado
  let drag = null;    // { id, dx, dy, width, height }

  function toSvgPoint(ev) {
    const pt = canvas.createSVGPoint();
    pt.x = ev.clientX;
    pt.y = ev.clientY;
    return pt.matrixTransform(canvas.getScreenCTM().inverse());
  }

  function drawConnector(e, byId, selectedId) {
    const a = byId.get(e.sourceId);
    const b = byId.get(e.targetId);
    if (!a || !b) return; // extremo inexistente: no se dibuja
    const ca = center(a);
    const cb = center(b);
    const line = { x1: ca.x, y1: ca.y, x2: cb.x, y2: cb.y };

    const g = svgEl('g', { 'data-id': e.id, 'data-type': 'CONNECTOR', cursor: 'pointer' });
    // Línea invisible más ancha: facilita hacer clic sobre el conector.
    g.append(svgEl('line', { ...line, stroke: '#000', 'stroke-opacity': 0, 'stroke-width': 14, 'pointer-events': 'stroke' }));
    g.append(svgEl('line', { ...line, class: `connector${selectedId === e.id ? ' selected' : ''}` }));
    canvas.append(g);
  }

  function drawShape(e, { selectedId, connectSourceId }) {
    const selected = selectedId === e.id;
    const g = svgEl('g', {
      'data-id': e.id,
      'data-type': e.type,
      class: 'shape',
      cursor: connectSourceId ? 'crosshair' : 'move'
    });

    if (e.type === 'RECTANGLE') {
      const rectAttrs = {
        x: e.x, y: e.y, width: e.width, height: e.height, rx: 8,
        fill: '#e8f0f7', stroke: '#597995',
        class: selected ? 'selected' : ''
      };
      // Origen de una conexión en curso: resaltado inline para no depender del CSS.
      if (connectSourceId === e.id) rectAttrs.style = 'stroke:#d97706;stroke-width:3';
      g.append(svgEl('rect', rectAttrs));
      const label = svgEl('text', { x: e.x + 12, y: e.y + e.height / 2 + 5, class: 'label' });
      label.textContent = e.text || 'Component';
      g.append(label);
    } else if (e.type === 'TEXT') {
      // Área de impacto transparente (el texto solo es difícil de clicar).
      const hitAttrs = {
        x: e.x, y: e.y, width: e.width, height: e.height,
        fill: '#000', 'fill-opacity': 0, 'pointer-events': 'all',
        stroke: selected || connectSourceId === e.id ? '#d97706' : 'none',
        'stroke-dasharray': '4 3'
      };
      g.append(svgEl('rect', hitAttrs));
      const label = svgEl('text', {
        x: e.x, y: e.y + 20, 'font-size': 20, fill: '#1d2733',
        class: `label${selected ? ' selected' : ''}`
      });
      label.textContent = e.text || 'Text';
      g.append(label);
    }
    canvas.append(g);
  }

  /** Dibuja el snapshot completo: el DOM es una proyección, no una fuente de verdad. */
  function render(snapshot) {
    current = snapshot;
    canvas.replaceChildren();
    const shapes = snapshot.board.elements.filter((e) => e.type !== 'CONNECTOR');
    const byId = new Map(shapes.map((e) => [e.id, e]));

    // Conectores primero (debajo), figuras después.
    snapshot.board.elements
        .filter((e) => e.type === 'CONNECTOR')
        .forEach((e) => drawConnector(e, byId, snapshot.selectedId));
    shapes.forEach((e) => drawShape(e, snapshot));
  }

  canvas.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0) return;
    const node = ev.target.closest?.('[data-id]');
    const connecting = Boolean(current?.connectSourceId);

    if (!node) {
      if (!connecting) handlers.select(null); // clic en vacío = deseleccionar
      return;
    }
    const id = node.dataset.id;

    if (connecting) { // modo conectar: el clic elige destino, no arrastra
      handlers.connectTarget(id);
      return;
    }

    handlers.select(id);

    const el = current?.board.elements.find((e) => e.id === id);
    if (!el || el.type === 'CONNECTOR') return; // los conectores no se arrastran
    const p = toSvgPoint(ev);
    drag = { id, dx: p.x - el.x, dy: p.y - el.y, width: el.width, height: el.height };
    canvas.setPointerCapture(ev.pointerId);
  });

  canvas.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    const p = toSvgPoint(ev);
    let x = p.x - drag.dx; // se conserva el punto de agarre dentro de la figura
    let y = p.y - drag.dy;
    const vb = canvas.viewBox?.baseVal;
    if (vb && vb.width > 0) { // mantener la figura dentro del área SVG
      x = clamp(x, 0, Math.max(0, vb.width - drag.width));
      y = clamp(y, 0, Math.max(0, vb.height - drag.height));
    }
    handlers.move(drag.id, Math.round(x), Math.round(y));
  });

  const endDrag = (ev) => {
    if (drag && canvas.hasPointerCapture?.(ev.pointerId)) canvas.releasePointerCapture(ev.pointerId);
    drag = null;
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  return { render, on(next) { handlers = { ...handlers, ...next }; } };
}