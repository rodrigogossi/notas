import { Eraser, Hand, Highlighter, Pen, Redo2, Trash2, Undo2 } from 'lucide-react';
import { getStroke } from 'perfect-freehand';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ADAPTIVE_INK, isAdaptiveInk, resolveStrokeColor } from '../handwriting/adaptiveInk';
import { isFarEnough } from '../handwriting/geometry';
import { getSvgPathFromStroke } from '../handwriting/svgPath';
import { getEffectiveTheme, subscribeTheme } from '../theme/theme';
import type { Stroke, StrokeTool } from '../types';
import PopoverButton from './PopoverButton';

type Point = [x: number, y: number, pressure: number];

const ACCENT_COLORS = ['#d92626', '#1e6fd9', '#1f9e4d', '#e6a412'];
const HISTORY_LIMIT = 50;
const HIGHLIGHTER_OPACITY = 0.35;

// smoothing/streamline em 0: o traço segue os pontos capturados sem arredondar/suavizar o desenho.
// thinning 0 no marca-texto: traço de largura constante (ponta chata), sem afinar com a pressão.
function freehandOptionsFor(tool: StrokeTool, size: number) {
  return {
    size,
    smoothing: 0,
    streamline: 0,
    simulatePressure: false,
    thinning: tool === 'highlighter' ? 0 : 0.5,
  };
}

const GROWTH_MARGIN = 150;
const GROWTH_STEP = 400;

interface StrokeCanvasProps {
  initialStrokes: Stroke[];
  initialCanvasSize: { width: number; height: number };
  onChange: (strokes: Stroke[]) => void;
  onCanvasSizeChange: (size: { width: number; height: number }) => void;
}

export default function StrokeCanvas({
  initialStrokes,
  initialCanvasSize,
  onChange,
  onCanvasSizeChange,
}: StrokeCanvasProps) {
  const effectiveTheme = useSyncExternalStore(subscribeTheme, getEffectiveTheme);
  const inkColor = ADAPTIVE_INK[effectiveTheme];

  const [strokes, setStrokesState] = useState<Stroke[]>(initialStrokes);
  const strokesRef = useRef(strokes);
  const [liveStroke, setLiveStroke] = useState<Point[] | null>(null);
  const [color, setColor] = useState(inkColor);
  const [customColor, setCustomColor] = useState('#8b5cf6');
  const [size, setSize] = useState(4);
  const [tool, setTool] = useState<StrokeTool>('pen');
  const [mode, setMode] = useState<'draw' | 'erase' | 'pan'>('draw');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // A página cresce pra baixo conforme o desenho se aproxima da borda, em vez de ficar travada
  // numa altura fixa — a largura acompanha o container (responsiva), e a área de desenho vira
  // rolável (não mais "encolhe pra caber tudo", que ficava reduzindo o traço conforme crescia).
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(initialCanvasSize.width);
  const [canvasHeight, setCanvasHeight] = useState(initialCanvasSize.height);
  const lastReportedSizeRef = useRef(initialCanvasSize);
  const onCanvasSizeChangeRef = useRef(onCanvasSizeChange);
  onCanvasSizeChangeRef.current = onCanvasSizeChange;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setContainerWidth(Math.round(width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const last = lastReportedSizeRef.current;
    if (last.width === containerWidth && last.height === canvasHeight) return;
    const timeout = setTimeout(() => {
      lastReportedSizeRef.current = { width: containerWidth, height: canvasHeight };
      onCanvasSizeChangeRef.current({ width: containerWidth, height: canvasHeight });
    }, 400);
    return () => clearTimeout(timeout);
  }, [containerWidth, canvasHeight]);

  function growForPoint(y: number) {
    setCanvasHeight((prev) => {
      if (y <= prev - GROWTH_MARGIN) return prev;
      return Math.ceil((y + GROWTH_MARGIN) / GROWTH_STEP) * GROWTH_STEP;
    });
  }

  // A "caneta preta" é adaptativa (preta no claro, branca no escuro, como no Apple Notes) — se a
  // seleção atual for essa caneta, acompanha a troca de tema em vez de continuar com a cor antiga.
  useEffect(() => {
    setColor((prev) => (isAdaptiveInk(prev) ? inkColor : prev));
  }, [inkColor]);

  const svgRef = useRef<SVGSVGElement>(null);
  const activePointerId = useRef<number | null>(null);
  const historyRef = useRef<Stroke[][]>([]);
  const futureRef = useRef<Stroke[][]>([]);

  function syncHistoryFlags() {
    setCanUndo(historyRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }

  function commit(next: Stroke[]) {
    historyRef.current.push(strokesRef.current);
    if (historyRef.current.length > HISTORY_LIMIT) historyRef.current.shift();
    futureRef.current = [];
    strokesRef.current = next;
    setStrokesState(next);
    onChange(next);
    syncHistoryFlags();
  }

  function undo() {
    const prev = historyRef.current.pop();
    if (!prev) return;
    futureRef.current.push(strokesRef.current);
    strokesRef.current = prev;
    setStrokesState(prev);
    onChange(prev);
    syncHistoryFlags();
  }

  function redo() {
    const next = futureRef.current.pop();
    if (!next) return;
    historyRef.current.push(strokesRef.current);
    strokesRef.current = next;
    setStrokesState(next);
    onChange(next);
    syncHistoryFlags();
  }

  function clearAll() {
    if (strokesRef.current.length === 0) return;
    commit([]);
  }

  function selectTool(next: StrokeTool) {
    setTool(next);
    setMode('draw');
  }

  function pointFromEvent(e: React.PointerEvent<SVGSVGElement>): Point {
    const svg = svgRef.current!;
    const pressure = e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : 0.5;
    // getBoundingClientRect() dá pixels CSS, mas o viewBox pode não ter a mesma proporção do
    // tamanho renderizado (o SVG escala/centraliza para caber) — sem essa conversão via CTM o
    // traço acaba desenhado deslocado da posição real da caneta.
    const ctm = svg.getScreenCTM();
    if (!ctm) return [0, 0, pressure];
    const cursor = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return [cursor.x, cursor.y, pressure];
  }

  function eraseAt(point: Point) {
    const threshold = 12;
    const hit = strokesRef.current.find((stroke) =>
      stroke.points.some((p) => Math.hypot(p[0] - point[0], p[1] - point[1]) <= threshold),
    );
    if (hit) commit(strokesRef.current.filter((s) => s !== hit));
  }

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    // modo mãozinha: deixa o navegador tratar o toque normalmente (rolar/navegar), sem desenhar
    if (mode === 'pan') return;
    if (!e.isPrimary || activePointerId.current !== null) return;
    e.preventDefault();
    svgRef.current!.setPointerCapture(e.pointerId);
    activePointerId.current = e.pointerId;
    const point = pointFromEvent(e);
    if (mode === 'erase') {
      eraseAt(point);
      return;
    }
    growForPoint(point[1]);
    setLiveStroke([point]);
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (mode === 'pan') return;
    if (e.pointerId !== activePointerId.current) return;
    const point = pointFromEvent(e);
    if (mode === 'erase') {
      eraseAt(point);
      return;
    }
    growForPoint(point[1]);
    setLiveStroke((prev) => {
      if (!prev) return prev;
      const last = prev[prev.length - 1];
      if (!isFarEnough(last, point)) return prev;
      return [...prev, point];
    });
  }

  function handlePointerUp(e: React.PointerEvent<SVGSVGElement>) {
    if (mode === 'pan') return;
    if (e.pointerId !== activePointerId.current) return;
    activePointerId.current = null;
    if (liveStroke && liveStroke.length > 1) {
      commit([...strokesRef.current, { points: liveStroke, color, size, tool }]);
    }
    setLiveStroke(null);
  }

  const colors = [inkColor, ...ACCENT_COLORS];
  const currentColor = resolveStrokeColor(color, effectiveTheme);

  return (
    <div className="stroke-canvas">
      <div className="stroke-toolbar">
        <div className="toolbar-group">
          <button
            className={`tool-button ${mode === 'draw' && tool === 'pen' ? 'active' : ''}`}
            onClick={() => selectTool('pen')}
            aria-label="Caneta"
            title="Caneta"
          >
            <Pen size={16} />
          </button>
          <button
            className={`tool-button ${mode === 'draw' && tool === 'highlighter' ? 'active' : ''}`}
            onClick={() => selectTool('highlighter')}
            aria-label="Marca-texto"
            title="Marca-texto"
          >
            <Highlighter size={16} />
          </button>
          <button
            className={`tool-button ${mode === 'pan' ? 'active' : ''}`}
            onClick={() => setMode('pan')}
            aria-label="Mão (navegar sem desenhar)"
            title="Mão"
          >
            <Hand size={16} />
          </button>
          <button
            className={`tool-button ${mode === 'erase' ? 'active' : ''}`}
            onClick={() => setMode('erase')}
            aria-label="Borracha"
            title="Borracha"
          >
            <Eraser size={16} />
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          {colors.map((c) => (
            <button
              key={c}
              className={`color-swatch ${color === c ? 'active' : ''}`}
              style={{ background: c }}
              onClick={() => {
                setColor(c);
                setMode('draw');
              }}
              aria-label={`Cor ${c}`}
            />
          ))}
          <input
            type="color"
            className={`color-swatch color-swatch--custom ${color === customColor ? 'active' : ''}`}
            value={customColor}
            onChange={(e) => {
              setCustomColor(e.target.value);
              setColor(e.target.value);
              setMode('draw');
            }}
            aria-label="Cor personalizada"
            title="Cor personalizada"
          />
        </div>

        <PopoverButton
          icon={<span className="brush-size-dot" style={{ width: size, height: size, background: currentColor }} />}
          ariaLabel="Espessura do traço"
        >
          <div className="brush-size-panel">
            <span
              className="brush-size-preview"
              style={{ width: size * 2, height: size * 2, background: currentColor }}
            />
            <input
              type="range"
              min={2}
              max={28}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
            />
          </div>
        </PopoverButton>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <button
            className="tool-button"
            onClick={undo}
            disabled={!canUndo}
            aria-label="Desfazer"
            title="Desfazer"
          >
            <Undo2 size={16} />
          </button>
          <button
            className="tool-button"
            onClick={redo}
            disabled={!canRedo}
            aria-label="Refazer"
            title="Refazer"
          >
            <Redo2 size={16} />
          </button>
        </div>

        <button className="icon-button" onClick={clearAll} aria-label="Limpar tudo" title="Limpar tudo">
          <Trash2 size={16} />
        </button>
      </div>
      <div className="stroke-surface-wrapper" ref={scrollRef}>
        <svg
          ref={svgRef}
          className="stroke-surface"
          width={containerWidth}
          height={canvasHeight}
          viewBox={`0 0 ${containerWidth} ${canvasHeight}`}
          style={{
            touchAction: mode === 'pan' ? 'auto' : 'none',
            cursor: mode === 'pan' ? 'grab' : 'default',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {strokes.map((stroke, i) => {
            const strokeTool = stroke.tool ?? 'pen';
            const isHighlighter = strokeTool === 'highlighter';
            return (
              <path
                key={i}
                d={getSvgPathFromStroke(getStroke(stroke.points, freehandOptionsFor(strokeTool, stroke.size)))}
                fill={resolveStrokeColor(stroke.color, effectiveTheme)}
                opacity={isHighlighter ? HIGHLIGHTER_OPACITY : 1}
                style={isHighlighter ? { mixBlendMode: 'multiply' } : undefined}
              />
            );
          })}
          {liveStroke && (
            <path
              d={getSvgPathFromStroke(getStroke(liveStroke, freehandOptionsFor(tool, size)))}
              fill={currentColor}
              opacity={tool === 'highlighter' ? HIGHLIGHTER_OPACITY : 1}
              style={tool === 'highlighter' ? { mixBlendMode: 'multiply' } : undefined}
            />
          )}
        </svg>
      </div>
    </div>
  );
}
