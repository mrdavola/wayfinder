import { useEffect, useRef } from 'react';
import './HotspotOverlay.css';
import WallMapPanel         from './panels/WallMapPanel';
import SpecimenCabinetPanel from './panels/SpecimenCabinetPanel';
import BulletinBoardPanel   from './panels/BulletinBoardPanel';

const DIALOG_LABELS = {
  wallMap: 'Wall Map',
  specimenCabinet: 'Specimen Cabinet',
  bulletinBoard: 'Bulletin Board',
};

function CabinContent({ role, projects, completedProjects, skills, messages, onMarkRead }) {
  switch (role) {
    case 'wallMap':
      return <WallMapPanel projects={projects} completedProjects={completedProjects} />;
    case 'specimenCabinet':
      return <SpecimenCabinetPanel skills={skills} />;
    case 'bulletinBoard':
      return <BulletinBoardPanel messages={messages} onMarkRead={onMarkRead} />;
    default:
      return <p className="ho-empty">Coming soon.</p>;
  }
}

export default function CabinOverlay({
  role,
  projects = [],
  completedProjects = [],
  skills = [],
  messages = [],
  onClose,
  onMarkRead,
}) {
  const sheetRef = useRef(null);

  useEffect(() => {
    sheetRef.current?.focus();
  }, []);

  return (
    <div
      className="hotspot-overlay cabin-overlay"
      data-role={role}
      role="dialog"
      aria-modal="true"
      aria-label={DIALOG_LABELS[role] ?? role}
    >
      <div
        className="hotspot-overlay__backdrop cabin-overlay__backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="hotspot-overlay__sheet" ref={sheetRef} tabIndex={-1}>
        <button
          className="hotspot-overlay__close"
          onClick={onClose}
          aria-label="Close"
          type="button"
        >
          <span aria-hidden="true">×</span>
        </button>
        <div className="hotspot-overlay__scroll">
          <CabinContent
            role={role}
            projects={projects}
            completedProjects={completedProjects}
            skills={skills}
            messages={messages}
            onMarkRead={onMarkRead}
          />
        </div>
      </div>
    </div>
  );
}
