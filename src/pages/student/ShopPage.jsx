import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Star } from 'lucide-react';
import { rewardItems, inventory, tokens } from '../../lib/api';
import { STBadge } from '../../components/xp/STBadge';
import { getStudentSession } from '../../lib/studentSession';
import './ShopPage.css';

const TABS = [
  { key: 'companion', label: 'Companions' },
  { key: 'gear', label: 'Gear' },
  { key: 'theme', label: 'Themes' },
];

export default function ShopPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('companion');
  const [items, setItems] = useState([]);
  const [ownedSlugs, setOwnedSlugs] = useState(new Set());
  const [balance, setBalance] = useState(0);
  const [buying, setBuying] = useState(null);
  const session = getStudentSession();

  useEffect(() => {
    if (!session?.studentId) return;
    loadData();
  }, []);

  async function loadData() {
    const [allItems, inv, bal] = await Promise.all([
      rewardItems.getAll(),
      inventory.getForStudent(session.studentId),
      tokens.getBalance(session.studentId),
    ]);
    setItems(allItems);
    setOwnedSlugs(new Set(inv.map(i => i.item_slug)));
    setBalance(bal.balance);
  }

  const filtered = items.filter(i => i.category === tab);

  async function handleBuy(item) {
    if (buying || ownedSlugs.has(item.slug)) return;
    if (balance < item.st_cost) return;
    setBuying(item.slug);
    try {
      const result = await inventory.buyItem(session.studentId, item.slug, item.st_cost);
      if (result.error) {
        alert(result.error);
        return;
      }
      setBalance(result.balance);
      setOwnedSlugs(prev => new Set([...prev, item.slug]));
    } catch (err) {
      console.error('Purchase failed:', err);
    } finally {
      setBuying(null);
    }
  }

  if (!session?.studentId) {
    return <div className="shop-page"><p>Please sign in as a student first.</p></div>;
  }

  return (
    <div className="shop-page">
      <div className="shop-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/student')} className="btn btn-ghost" style={{ padding: 6 }}>
            <ArrowLeft size={20} />
          </button>
          <h1>Explorer Shop</h1>
        </div>
        <STBadge balance={balance} size="lg" />
      </div>

      <div className="shop-tabs">
        {TABS.map(t => (
          <button key={t.key} className={`shop-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="shop-grid">
        {filtered.map(item => {
          const owned = ownedSlugs.has(item.slug);
          const locked = !item.st_cost && item.milestone_type;
          const tooExpensive = item.st_cost && balance < item.st_cost;

          return (
            <div key={item.slug} className={`shop-card ${owned ? 'owned' : ''} ${locked ? 'locked' : ''}`}>
              <div className="shop-card-icon">{item.icon}</div>
              <div className="shop-card-name">{item.name}</div>
              {item.rarity && (
                <span className={`shop-card-rarity rarity-${item.rarity}`}>{item.rarity}</span>
              )}
              <div className="shop-card-desc">{item.description}</div>

              {owned ? (
                <span className="shop-owned-badge">Owned ✓</span>
              ) : locked ? (
                <span className="shop-locked-badge">
                  <Lock size={12} />
                  {item.milestone_type === 'rank' ? `Reach ${item.milestone_value}` : `Earn ${item.milestone_value} badge`}
                </span>
              ) : (
                <button
                  className="shop-buy-btn"
                  onClick={() => handleBuy(item)}
                  disabled={tooExpensive || buying === item.slug}
                >
                  <Star size={12} fill="#78350f" style={{ marginRight: 4, verticalAlign: -1 }} />
                  {buying === item.slug ? '...' : item.st_cost}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
