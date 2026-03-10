import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { rewardItems, inventory } from '../../lib/api';
import { getStudentSession } from '../../lib/studentSession';
import './CollectionPage.css';

const CATEGORIES = [
  { key: 'companion', label: 'Companions' },
  { key: 'gear', label: 'Gear' },
  { key: 'title', label: 'Titles' },
  { key: 'theme', label: 'Themes' },
];

export default function CollectionPage() {
  const navigate = useNavigate();
  const [allItems, setAllItems] = useState([]);
  const [ownedMap, setOwnedMap] = useState({});
  const [activeSlugs, setActiveSlugs] = useState(new Set());
  const session = getStudentSession();

  useEffect(() => {
    if (!session?.studentId) return;
    loadData();
  }, []);

  async function loadData() {
    const [items, inv] = await Promise.all([
      rewardItems.getAll(),
      inventory.getForStudent(session.studentId),
    ]);
    setAllItems(items);
    const owned = {};
    const active = new Set();
    for (const i of inv) {
      owned[i.item_slug] = true;
      if (i.is_active) active.add(i.item_slug);
    }
    setOwnedMap(owned);
    setActiveSlugs(active);
  }

  async function handleSetActive(item) {
    if (!ownedMap[item.slug]) return;
    await inventory.setActive(session.studentId, item.slug, item.category);
    const newActive = new Set(activeSlugs);
    allItems.filter(i => i.category === item.category).forEach(i => newActive.delete(i.slug));
    newActive.add(item.slug);
    setActiveSlugs(newActive);
  }

  if (!session?.studentId) {
    return <div className="collection-page"><p>Please sign in as a student first.</p></div>;
  }

  return (
    <div className="collection-page">
      <div className="collection-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/student')} className="btn btn-ghost" style={{ padding: 6 }}>
            <ArrowLeft size={20} />
          </button>
          <h1>My Collection</h1>
        </div>
        <span style={{ fontSize: '0.875rem', color: 'var(--graphite)' }}>
          {Object.keys(ownedMap).length} / {allItems.length} collected
        </span>
      </div>

      {CATEGORIES.map(cat => {
        const catItems = allItems.filter(i => i.category === cat.key);
        if (catItems.length === 0) return null;

        return (
          <div key={cat.key} className="collection-section">
            <h2>{cat.label}</h2>
            <div className="collection-grid">
              {catItems.map(item => {
                const owned = ownedMap[item.slug];
                const active = activeSlugs.has(item.slug);

                return (
                  <div
                    key={item.slug}
                    className={`collection-item ${owned ? '' : 'unowned'} ${active ? 'active' : ''}`}
                    onClick={() => owned && handleSetActive(item)}
                    title={owned ? `Click to equip ${item.name}` : item.name}
                  >
                    {active && <div className="collection-active-check"><Check size={12} /></div>}
                    <div className="collection-item-icon">{owned ? item.icon : '?'}</div>
                    <div className="collection-item-name">{owned ? item.name : '???'}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
