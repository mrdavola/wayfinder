import './Hotspot.css';
import FieldFigure from './FieldFigure';
import {
  TrailheadSignIcon,
  MailboxIcon,
  BulletinBoardIcon,
  CampfireIcon,
  LanternIcon,
  CairnIcon,
  ChallengerIcon,
  JournalIcon,
  StretchIcon,
  ParentLetterIcon,
  WallMapIcon,
  SpecimenCabinetIcon,
} from './HotspotIcons';

function TeammateAvatar({ teammate }) {
  if (teammate?.avatar_image_url) {
    return (
      <img
        src={teammate.avatar_image_url}
        alt=""
        width="44"
        height="68"
        style={{
          borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
          border: '2px solid rgba(90,70,40,0.18)',
          objectFit: 'cover',
        }}
      />
    );
  }
  if (teammate?.avatar_emoji) {
    return (
      <span style={{ fontSize: 44, lineHeight: 1, filter: 'drop-shadow(0 1px 0 rgba(0,0,0,0.2))' }}>
        {teammate.avatar_emoji}
      </span>
    );
  }
  return <FieldFigure size={68} outfit="field" mood="curious" label="" />;
}

function HotspotIcon({ role, state, stageNumber, sceneTitle, teammate, biomeId }) {
  switch (role) {
    case 'trailheadSign': return <TrailheadSignIcon title={sceneTitle} biomeId={biomeId} />;
    case 'mailbox':       return <MailboxIcon biomeId={biomeId} />;
    case 'bulletinSubmit':
    case 'bulletinBoard': return <BulletinBoardIcon />;
    case 'reflection':    return <CampfireIcon biomeId={biomeId} />;
    case 'stage':         return <CairnIcon state={state} number={stageNumber} biomeId={biomeId} />;
    case 'challenger':    return <ChallengerIcon />;
    case 'stretch':       return <StretchIcon />;
    case 'parentLetter':  return <ParentLetterIcon />;
    case 'wallMap':       return <WallMapIcon />;
    case 'specimenCabinet': return <SpecimenCabinetIcon />;
    case 'teammate':      return <TeammateAvatar teammate={teammate} />;
    case 'guide':         return null; // guide rendered separately as SceneFigure
    default:              return <LanternIcon lit />;
  }
}

/**
 * @param {object} props
 * @param {string} props.id
 * @param {string} props.role
 * @param {string} props.x
 * @param {string} props.y
 * @param {string} props.label
 * @param {string} [props.sceneTitle]    used by trailheadSign to carve project title
 * @param {number} [props.stageNumber]   used by stage cairns
 * @param {object} [props.teammate]      used by teammate avatars
 * @param {'future'|'active'|'completed'} [props.state='active']
 * @param {boolean} [props.igniting]
 * @param {boolean} [props.showTag=true] show visible name tag below the prop
 * @param {() => void} [props.onActivate]
 */
export default function Hotspot({
  id,
  role,
  x,
  y,
  label,
  sceneTitle,
  stageNumber,
  teammate,
  biomeId,
  state = 'active',
  igniting = false,
  showTag = true,
  onActivate,
}) {
  const disabled = state === 'future';
  return (
    <button
      type="button"
      className={`hotspot${igniting ? ' hotspot--igniting' : ''}`}
      data-role={role}
      data-state={state}
      data-id={id}
      aria-label={label}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onActivate}
      style={{ left: x, top: y }}
    >
      <span className="hotspot__prop" aria-hidden="true">
        <HotspotIcon
          role={role}
          state={state}
          stageNumber={stageNumber}
          sceneTitle={sceneTitle}
          teammate={teammate}
          biomeId={biomeId}
        />
        <span className="hotspot__pulse" aria-hidden="true" />
      </span>
      {showTag && label && (
        <span className="hotspot__tag" aria-hidden="true">{label}</span>
      )}
    </button>
  );
}
