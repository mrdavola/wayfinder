import { useState, useCallback, useRef, useEffect } from 'react';
import { DndContext, useDraggable } from '@dnd-kit/core';
import { Plus, Link2, Trash2, X } from 'lucide-react';

const CARD_COLORS = [
  { name: 'Parchment', value: '#E8D5B7' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Gold', value: '#D4A843' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Chalk', value: '#F8F6F1' },
];

const MAX_CARDS = 20;

let cardCounter = 0;
let connCounter = 0;

function DraggableCard({ card, isSelected, isConnectMode, connectFrom, onSelect, onConnect, onDelete, onTextChange, onColorChange }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    disabled: isSelected, // disable drag when editing
  });

  const style = {
    position: 'absolute',
    left: card.x,
    top: card.y,
    width: card.width,
    height: card.height,
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    zIndex: isDragging ? 50 : isSelected ? 40 : 10,
    background: card.color,
    borderRadius: 8,
    boxShadow: isDragging
      ? '0 8px 24px rgba(0,0,0,0.18)'
      : isSelected
        ? '0 2px 8px rgba(0,0,0,0.1), 0 0 0 2px #3B82F6'
        : '0 2px 8px rgba(0,0,0,0.1)',
    fontFamily: 'var(--font-body)',
    cursor: isConnectMode ? 'crosshair' : isDragging ? 'grabbing' : 'grab',
    userSelect: 'none',
    transition: isDragging ? 'box-shadow 0.15s' : 'box-shadow 0.15s, transform 0s',
    outline: connectFrom === card.id ? '2px dashed #3B82F6' : 'none',
    outlineOffset: 2,
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (isConnectMode) {
      onConnect(card.id);
    } else {
      onSelect(card.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={handleClick}
      {...(isSelected ? {} : { ...listeners, ...attributes })}
    >
      {/* Delete button */}
      {isSelected && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
          style={{
            position: 'absolute', top: -8, right: -8,
            width: 22, height: 22, borderRadius: '50%',
            background: '#EF4444', border: 'none', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 60, padding: 0,
          }}
          aria-label="Delete card"
        >
          <X size={12} strokeWidth={3} />
        </button>
      )}

      {/* Card content */}
      {isSelected ? (
        <div style={{ padding: 8, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <textarea
            value={card.text}
            onChange={(e) => onTextChange(card.id, e.target.value)}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            style={{
              flex: 1, width: '100%', border: 'none', background: 'transparent',
              resize: 'none', outline: 'none', fontSize: 13, lineHeight: 1.4,
              fontFamily: 'var(--font-body)', color: 'var(--ink)',
            }}
            placeholder="Type here..."
          />
          {/* Color picker */}
          <div style={{ display: 'flex', gap: 5, paddingTop: 6, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
            {CARD_COLORS.map((c) => (
              <button
                key={c.name}
                onClick={(e) => { e.stopPropagation(); onColorChange(card.id, c.value); }}
                title={c.name}
                style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: c.value,
                  border: card.color === c.value ? '2px solid var(--ink)' : '1.5px solid rgba(0,0,0,0.15)',
                  cursor: 'pointer', padding: 0, flexShrink: 0,
                }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div style={{
          padding: 10, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, lineHeight: 1.4, color: 'var(--ink)', textAlign: 'center',
          overflow: 'hidden', wordBreak: 'break-word',
        }}>
          {card.text || 'Click to edit'}
        </div>
      )}
    </div>
  );
}

export default function CanvasBoard({ onSave }) {
  const [cards, setCards] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [connectMode, setConnectMode] = useState(false);
  const [connectFrom, setConnectFrom] = useState(null);
  const canvasRef = useRef(null);
  const saveTimerRef = useRef(null);

  // Debounced save
  const debouncedSave = useCallback((newCards, newConns) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      onSave?.({ cards: newCards, connections: newConns });
    }, 500);
  }, [onSave]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const updateCards = useCallback((newCards) => {
    setCards(newCards);
    debouncedSave(newCards, connections);
  }, [connections, debouncedSave]);

  const updateConnections = useCallback((newConns) => {
    setConnections(newConns);
    debouncedSave(cards, newConns);
  }, [cards, debouncedSave]);

  // Add card
  const addCard = () => {
    if (cards.length >= MAX_CARDS) return;
    cardCounter++;
    const newCard = {
      id: `card-${Date.now()}-${cardCounter}`,
      text: '',
      x: 40 + (cards.length % 4) * 180,
      y: 20 + Math.floor(cards.length / 4) * 130,
      color: '#E8D5B7',
      width: 160,
      height: 100,
    };
    const next = [...cards, newCard];
    setCards(next);
    setSelectedCard(newCard.id);
    debouncedSave(next, connections);
  };

  // Delete card
  const deleteCard = (id) => {
    const nextCards = cards.filter(c => c.id !== id);
    const nextConns = connections.filter(c => c.from !== id && c.to !== id);
    setCards(nextCards);
    setConnections(nextConns);
    setSelectedCard(null);
    debouncedSave(nextCards, nextConns);
  };

  // Edit text
  const handleTextChange = (id, text) => {
    const next = cards.map(c => c.id === id ? { ...c, text } : c);
    updateCards(next);
  };

  // Change color
  const handleColorChange = (id, color) => {
    const next = cards.map(c => c.id === id ? { ...c, color } : c);
    updateCards(next);
  };

  // Select / deselect
  const handleSelect = (id) => {
    setSelectedCard(id);
  };

  const handleCanvasClick = () => {
    setSelectedCard(null);
    if (connectMode) {
      setConnectMode(false);
      setConnectFrom(null);
    }
  };

  // Connect mode
  const handleConnect = (id) => {
    if (!connectFrom) {
      setConnectFrom(id);
    } else if (connectFrom !== id) {
      // Check for existing duplicate
      const exists = connections.some(c =>
        (c.from === connectFrom && c.to === id) || (c.from === id && c.to === connectFrom)
      );
      if (!exists) {
        connCounter++;
        const newConn = { id: `conn-${Date.now()}-${connCounter}`, from: connectFrom, to: id };
        const next = [...connections, newConn];
        setConnections(next);
        debouncedSave(cards, next);
      }
      setConnectFrom(null);
      setConnectMode(false);
    }
  };

  const toggleConnectMode = () => {
    setConnectMode(!connectMode);
    setConnectFrom(null);
    setSelectedCard(null);
  };

  // Delete connection on click
  const deleteConnection = (id) => {
    const next = connections.filter(c => c.id !== id);
    updateConnections(next);
  };

  // Drag end
  const handleDragEnd = (event) => {
    const { active, delta } = event;
    if (!delta) return;
    const next = cards.map(c =>
      c.id === active.id
        ? { ...c, x: Math.max(0, c.x + delta.x), y: Math.max(0, c.y + delta.y) }
        : c
    );
    setCards(next);
    debouncedSave(next, connections);
  };

  return (
    <div style={{ fontFamily: 'var(--font-body)', marginBottom: 8 }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        background: 'var(--paper)', borderRadius: '10px 10px 0 0',
        border: '1.5px solid var(--pencil)', borderBottom: 'none',
        flexWrap: 'wrap',
      }}>
        <button
          onClick={addCard}
          disabled={cards.length >= MAX_CARDS}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
            background: cards.length >= MAX_CARDS ? 'var(--pencil)' : 'var(--ink)',
            color: '#fff', border: 'none', borderRadius: 6, cursor: cards.length >= MAX_CARDS ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
          }}
        >
          <Plus size={15} /> Add Card
        </button>

        <button
          onClick={toggleConnectMode}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
            background: connectMode ? '#3B82F6' : 'transparent',
            color: connectMode ? '#fff' : 'var(--ink)',
            border: `1.5px solid ${connectMode ? '#3B82F6' : 'var(--pencil)'}`,
            borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            fontFamily: 'var(--font-body)',
          }}
        >
          <Link2 size={15} /> {connectMode ? 'Connecting...' : 'Connect'}
        </button>

        {connectMode && (
          <span style={{ fontSize: 12, color: 'var(--graphite)', fontStyle: 'italic' }}>
            {connectFrom ? 'Now click the second card' : 'Click the first card'}
          </span>
        )}

        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--graphite)' }}>
          {cards.length}/{MAX_CARDS} cards
        </span>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{
          position: 'relative', minHeight: 420, overflow: 'hidden',
          background: 'var(--chalk)',
          border: '1.5px solid var(--pencil)',
          borderRadius: '0 0 10px 10px',
          backgroundImage: 'radial-gradient(circle, var(--pencil) 0.8px, transparent 0.8px)',
          backgroundSize: '20px 20px',
        }}
      >
        {/* SVG Connections layer */}
        <svg style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          pointerEvents: 'none', zIndex: 5,
        }}>
          <defs>
            <marker id="canvas-arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#555" />
            </marker>
          </defs>
          {connections.map(conn => {
            const from = cards.find(c => c.id === conn.from);
            const to = cards.find(c => c.id === conn.to);
            if (!from || !to) return null;
            const x1 = from.x + from.width / 2;
            const y1 = from.y + from.height / 2;
            const x2 = to.x + to.width / 2;
            const y2 = to.y + to.height / 2;
            return (
              <line
                key={conn.id}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#555" strokeWidth={2}
                markerEnd="url(#canvas-arrowhead)"
                style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); deleteConnection(conn.id); }}
              />
            );
          })}
        </svg>

        {/* DnD Cards */}
        <DndContext onDragEnd={handleDragEnd}>
          {cards.map(card => (
            <DraggableCard
              key={card.id}
              card={card}
              isSelected={selectedCard === card.id}
              isConnectMode={connectMode}
              connectFrom={connectFrom}
              onSelect={handleSelect}
              onConnect={handleConnect}
              onDelete={deleteCard}
              onTextChange={handleTextChange}
              onColorChange={handleColorChange}
            />
          ))}
        </DndContext>

        {/* Empty state */}
        {cards.length === 0 && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', color: 'var(--graphite)',
            pointerEvents: 'none', opacity: 0.5,
          }}>
            <Plus size={28} style={{ marginBottom: 6 }} />
            <div style={{ fontSize: 14, fontWeight: 600 }}>Click "Add Card" to get started</div>
            <div style={{ fontSize: 12, marginTop: 2 }}>Drag cards to arrange, connect to show relationships</div>
          </div>
        )}
      </div>
    </div>
  );
}
