import { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, ChevronUp, ChevronDown, Trash2, Play, X, ChevronLeft, ChevronRight, ImagePlus } from 'lucide-react';

const SLIDE_THEMES = [
  { key: 'light', bg: '#FFFFFF', text: '#1a1a1a', accent: 'var(--lab-blue)', label: 'Light' },
  { key: 'dark', bg: '#1a1a2e', text: '#f0f0f0', accent: 'var(--compass-gold)', label: 'Dark' },
  { key: 'blue', bg: '#1e3a5f', text: '#f0f0f0', accent: '#5BA4E6', label: 'Ocean' },
  { key: 'warm', bg: '#3d2b1f', text: '#f5e6d3', accent: 'var(--compass-gold)', label: 'Warm' },
];

const MAX_SLIDES = 8;

function createSlide(index) {
  return {
    id: `slide-${Date.now()}-${index}`,
    title: '',
    body: '',
    imageUrl: null,
    theme: 'light',
  };
}

function getTheme(key) {
  return SLIDE_THEMES.find(t => t.key === key) || SLIDE_THEMES[0];
}

/* ── Slide Thumbnail ─────────────────────────────── */
function SlideThumbnail({ slide, index, isSelected, onSelect, onMoveUp, onMoveDown, total }) {
  const theme = getTheme(slide.theme);
  return (
    <div
      style={{
        position: 'relative',
        cursor: 'pointer',
        borderRadius: 6,
        overflow: 'hidden',
        border: isSelected ? '2px solid var(--compass-gold)' : '2px solid transparent',
        boxShadow: isSelected ? '0 0 0 2px rgba(198,163,80,0.3)' : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
      onClick={onSelect}
      className="slide-thumb-wrap"
    >
      {/* Mini slide preview */}
      <div style={{
        width: 80,
        height: 50,
        background: theme.bg,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '4px 6px',
        position: 'relative',
      }}>
        {slide.imageUrl && (
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${slide.imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.35,
          }} />
        )}
        <div style={{
          fontSize: 7,
          fontWeight: 700,
          color: theme.text,
          textAlign: 'center',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          maxWidth: '100%',
          position: 'relative',
          zIndex: 1,
          fontFamily: 'var(--font-display)',
        }}>
          {slide.title || `Slide ${index + 1}`}
        </div>
        <div style={{
          fontSize: 5,
          color: theme.text,
          opacity: 0.6,
          textAlign: 'center',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          maxWidth: '100%',
          position: 'relative',
          zIndex: 1,
          marginTop: 2,
        }}>
          {slide.body ? slide.body.slice(0, 30) : ''}
        </div>
      </div>

      {/* Slide number */}
      <div style={{
        position: 'absolute',
        top: 2,
        left: 4,
        fontSize: 8,
        fontWeight: 700,
        color: theme.text,
        opacity: 0.5,
        zIndex: 2,
      }}>
        {index + 1}
      </div>

      {/* Reorder buttons – show on hover via CSS */}
      <div className="slide-thumb-actions" style={{
        position: 'absolute',
        top: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        zIndex: 3,
      }}>
        {index > 0 && (
          <button
            onClick={e => { e.stopPropagation(); onMoveUp(); }}
            style={reorderBtnStyle}
            title="Move up"
          >
            <ChevronUp size={10} />
          </button>
        )}
        {index < total - 1 && (
          <button
            onClick={e => { e.stopPropagation(); onMoveDown(); }}
            style={reorderBtnStyle}
            title="Move down"
          >
            <ChevronDown size={10} />
          </button>
        )}
      </div>
    </div>
  );
}

const reorderBtnStyle = {
  background: 'rgba(0,0,0,0.5)',
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  padding: '1px 2px',
  lineHeight: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 2,
};

/* ── Theme Picker ────────────────────────────────── */
function ThemePicker({ activeKey, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--graphite)' }}>Theme:</span>
      {SLIDE_THEMES.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          title={t.label}
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: t.bg,
            border: t.key === activeKey
              ? '2.5px solid var(--compass-gold)'
              : '2px solid var(--pencil)',
            cursor: 'pointer',
            boxShadow: t.key === activeKey ? '0 0 0 2px rgba(198,163,80,0.35)' : 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s',
            padding: 0,
          }}
        />
      ))}
    </div>
  );
}

/* ── Image Section ───────────────────────────────── */
function ImageSection({ imageUrl, onImageChange }) {
  const fileRef = useRef(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onImageChange(ev.target.result);
    reader.readAsDataURL(file);
  }

  function handlePasteUrl() {
    if (urlValue.trim()) {
      onImageChange(urlValue.trim());
      setUrlValue('');
      setShowUrlInput(false);
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      {imageUrl ? (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img
            src={imageUrl}
            alt="Slide"
            style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 6, objectFit: 'cover' }}
          />
          <button
            onClick={() => onImageChange(null)}
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              background: 'rgba(0,0,0,0.6)',
              color: '#fff',
              border: 'none',
              borderRadius: '50%',
              width: 22,
              height: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
            }}
            title="Remove image"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="file"
            accept="image/*"
            ref={fileRef}
            style={{ display: 'none' }}
            onChange={handleFile}
          />
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 12px',
              fontSize: 12,
              fontFamily: 'var(--font-body)',
              border: '1.5px dashed var(--pencil)',
              borderRadius: 6,
              background: 'transparent',
              color: 'var(--graphite)',
              cursor: 'pointer',
            }}
          >
            <ImagePlus size={14} />
            Upload image
          </button>
          {!showUrlInput ? (
            <button
              onClick={() => setShowUrlInput(true)}
              style={{
                fontSize: 12,
                fontFamily: 'var(--font-body)',
                border: 'none',
                background: 'transparent',
                color: 'var(--lab-blue)',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0,
              }}
            >
              or paste URL
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input
                type="url"
                placeholder="https://..."
                value={urlValue}
                onChange={e => setUrlValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePasteUrl()}
                style={{
                  fontSize: 12,
                  fontFamily: 'var(--font-body)',
                  padding: '4px 8px',
                  border: '1px solid var(--pencil)',
                  borderRadius: 4,
                  width: 180,
                }}
              />
              <button
                onClick={handlePasteUrl}
                style={{
                  fontSize: 11,
                  padding: '4px 8px',
                  borderRadius: 4,
                  border: 'none',
                  background: 'var(--lab-blue)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Add
              </button>
              <button
                onClick={() => { setShowUrlInput(false); setUrlValue(''); }}
                style={{
                  fontSize: 11,
                  padding: '4px 6px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--graphite)',
                  cursor: 'pointer',
                }}
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Slide Editor ────────────────────────────────── */
function SlideEditor({ slide, onChange, onDelete, canDelete }) {
  if (!slide) return null;
  const theme = getTheme(slide.theme);

  function update(field, value) {
    onChange({ ...slide, [field]: value });
  }

  return (
    <div style={{
      flex: 1,
      background: 'var(--paper)',
      borderRadius: 10,
      padding: 24,
      minHeight: 320,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      {/* Slide preview area */}
      <div style={{
        background: theme.bg,
        borderRadius: 8,
        padding: '24px 28px',
        position: 'relative',
        minHeight: 200,
        transition: 'background 0.2s',
      }}>
        {slide.imageUrl && (
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${slide.imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.2,
            borderRadius: 8,
          }} />
        )}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <input
            type="text"
            placeholder="Slide title..."
            value={slide.title}
            onChange={e => update('title', e.target.value)}
            style={{
              width: '100%',
              fontSize: 20,
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              color: theme.text,
              background: 'transparent',
              border: 'none',
              borderBottom: '1.5px solid transparent',
              outline: 'none',
              padding: '4px 0',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderBottomColor = theme.accent}
            onBlur={e => e.target.style.borderBottomColor = 'transparent'}
          />
          <textarea
            placeholder="Write your content here..."
            value={slide.body}
            onChange={e => update('body', e.target.value)}
            style={{
              width: '100%',
              fontSize: 14,
              fontFamily: 'var(--font-body)',
              color: theme.text,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              padding: '8px 0',
              resize: 'vertical',
              minHeight: 100,
              lineHeight: 1.6,
            }}
          />
        </div>
      </div>

      {/* Image section */}
      <ImageSection
        imageUrl={slide.imageUrl}
        onImageChange={url => update('imageUrl', url)}
      />

      {/* Bottom controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
      }}>
        <ThemePicker activeKey={slide.theme} onChange={key => update('theme', key)} />

        {canDelete && (
          <button
            onClick={onDelete}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontFamily: 'var(--font-body)',
              color: 'var(--specimen-red)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 4,
            }}
          >
            <Trash2 size={13} />
            Delete slide
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Preview Overlay ─────────────────────────────── */
function PreviewOverlay({ slides, startIndex, onClose }) {
  const [current, setCurrent] = useState(startIndex);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' || e.key === ' ') setCurrent(c => Math.min(c + 1, slides.length - 1));
      if (e.key === 'ArrowLeft') setCurrent(c => Math.max(c - 1, 0));
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [slides.length, onClose]);

  const slide = slides[current];
  if (!slide) return null;
  const theme = getTheme(slide.theme);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Close */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          background: 'rgba(255,255,255,0.15)',
          color: '#fff',
          border: 'none',
          borderRadius: '50%',
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 1001,
        }}
        title="Close (Esc)"
      >
        <X size={18} />
      </button>

      {/* Slide indicator */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'rgba(255,255,255,0.6)',
        fontSize: 13,
        fontFamily: 'var(--font-body)',
      }}>
        {current + 1} / {slides.length}
      </div>

      {/* Slide */}
      <div style={{
        width: '90vw',
        maxWidth: 800,
        aspectRatio: '16/9',
        background: theme.bg,
        borderRadius: 12,
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '48px 56px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {slide.imageUrl && (
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${slide.imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.25,
          }} />
        )}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{
            fontSize: 36,
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            color: theme.text,
            marginBottom: 16,
            lineHeight: 1.2,
          }}>
            {slide.title || `Slide ${current + 1}`}
          </h1>
          {slide.body && (
            <p style={{
              fontSize: 18,
              fontFamily: 'var(--font-body)',
              color: theme.text,
              opacity: 0.85,
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
            }}>
              {slide.body}
            </p>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div style={{
        display: 'flex',
        gap: 16,
        marginTop: 20,
        alignItems: 'center',
      }}>
        <button
          onClick={() => setCurrent(c => Math.max(c - 1, 0))}
          disabled={current === 0}
          style={{
            ...navBtnStyle,
            opacity: current === 0 ? 0.3 : 1,
          }}
        >
          <ChevronLeft size={20} />
        </button>
        {/* Dots */}
        <div style={{ display: 'flex', gap: 6 }}>
          {slides.map((_, i) => (
            <div
              key={i}
              onClick={() => setCurrent(i)}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: i === current ? '#fff' : 'rgba(255,255,255,0.3)',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            />
          ))}
        </div>
        <button
          onClick={() => setCurrent(c => Math.min(c + 1, slides.length - 1))}
          disabled={current === slides.length - 1}
          style={{
            ...navBtnStyle,
            opacity: current === slides.length - 1 ? 0.3 : 1,
          }}
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}

const navBtnStyle = {
  background: 'rgba(255,255,255,0.15)',
  color: '#fff',
  border: 'none',
  borderRadius: '50%',
  width: 40,
  height: 40,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};

/* ── Main Component ──────────────────────────────── */
export default function SlideBuilder({ onSave }) {
  const [slides, setSlides] = useState(() => [createSlide(0)]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [preview, setPreview] = useState(false);
  const saveTimerRef = useRef(null);

  // Debounced auto-save
  const debouncedSave = useCallback((slideData) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      onSave?.({ slides: slideData });
    }, 500);
  }, [onSave]);

  // Clean up timer
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  function updateSlides(next) {
    setSlides(next);
    debouncedSave(next);
  }

  function addSlide() {
    if (slides.length >= MAX_SLIDES) return;
    const next = [...slides, createSlide(slides.length)];
    updateSlides(next);
    setSelectedIndex(next.length - 1);
  }

  function deleteSlide(index) {
    if (slides.length <= 1) return;
    const next = slides.filter((_, i) => i !== index);
    updateSlides(next);
    setSelectedIndex(Math.min(selectedIndex, next.length - 1));
  }

  function moveSlide(fromIndex, direction) {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= slides.length) return;
    const next = [...slides];
    [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
    updateSlides(next);
    if (selectedIndex === fromIndex) setSelectedIndex(toIndex);
    else if (selectedIndex === toIndex) setSelectedIndex(fromIndex);
  }

  function updateSlide(index, updated) {
    const next = slides.map((s, i) => i === index ? updated : s);
    updateSlides(next);
  }

  const currentSlide = slides[selectedIndex] || slides[0];

  return (
    <>
      <style>{`
        .slide-thumb-wrap .slide-thumb-actions { opacity: 0; transition: opacity 0.15s; }
        .slide-thumb-wrap:hover .slide-thumb-actions { opacity: 1; }
      `}</style>

      <div style={{
        border: '1.5px solid var(--pencil)',
        borderRadius: 10,
        overflow: 'hidden',
        fontFamily: 'var(--font-body)',
        background: 'var(--parchment)',
      }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          borderBottom: '1px solid var(--pencil)',
          background: 'var(--paper)',
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={addSlide}
              disabled={slides.length >= MAX_SLIDES}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                fontWeight: 600,
                padding: '5px 10px',
                borderRadius: 6,
                border: '1.5px solid var(--pencil)',
                background: 'var(--paper)',
                color: slides.length >= MAX_SLIDES ? 'var(--pencil)' : 'var(--ink)',
                cursor: slides.length >= MAX_SLIDES ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              <Plus size={13} />
              Add Slide
            </button>
            <button
              onClick={() => setPreview(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                fontWeight: 600,
                padding: '5px 10px',
                borderRadius: 6,
                border: 'none',
                background: 'var(--ink)',
                color: 'var(--paper)',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              <Play size={12} />
              Preview
            </button>
          </div>
          <span style={{
            fontSize: 12,
            color: 'var(--graphite)',
          }}>
            Slide {selectedIndex + 1} of {slides.length}
          </span>
        </div>

        {/* Body: sidebar + editor */}
        <div style={{ display: 'flex', minHeight: 340 }}>
          {/* Sidebar */}
          <div style={{
            width: 100,
            background: 'var(--parchment)',
            borderRight: '1px solid var(--pencil)',
            padding: '10px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            overflowY: 'auto',
            maxHeight: 400,
          }}>
            {slides.map((slide, i) => (
              <SlideThumbnail
                key={slide.id}
                slide={slide}
                index={i}
                isSelected={i === selectedIndex}
                onSelect={() => setSelectedIndex(i)}
                onMoveUp={() => moveSlide(i, -1)}
                onMoveDown={() => moveSlide(i, 1)}
                total={slides.length}
              />
            ))}
          </div>

          {/* Editor */}
          <SlideEditor
            slide={currentSlide}
            onChange={updated => updateSlide(selectedIndex, updated)}
            onDelete={() => deleteSlide(selectedIndex)}
            canDelete={slides.length > 1}
          />
        </div>
      </div>

      {/* Preview overlay */}
      {preview && (
        <PreviewOverlay
          slides={slides}
          startIndex={selectedIndex}
          onClose={() => setPreview(false)}
        />
      )}
    </>
  );
}
