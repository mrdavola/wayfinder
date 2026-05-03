import Specimen from '../Specimen';

function messageText(msg) {
  if (msg.source === 'guide')    return msg.content;
  if (msg.source === 'feedback') return msg.warm_feedback || msg.cool_feedback || 'New feedback';
  if (msg.source === 'parent')   return msg.expectations || msg.child_loves || 'Message from home';
  return '';
}

function sourceLabel(source) {
  if (source === 'guide')    return 'From guide';
  if (source === 'feedback') return 'Project feedback';
  if (source === 'parent')   return 'Letter from home';
  return source;
}

function pinFor(source) {
  if (source === 'guide')    return 'pin';
  if (source === 'feedback') return 'clip';
  if (source === 'parent')   return 'tape';
  return 'none';
}

export default function BulletinBoardPanel({ messages, onMarkRead }) {
  if (messages.length === 0) {
    return (
      <div className="bbp-empty">
        <p>All clear — no new messages.</p>
      </div>
    );
  }

  return (
    <div className="bbp-root">
      <h2 className="bbp-title">Bulletin Board</h2>
      <div className="bbp-list">
        {messages.map(msg => {
          const isGuide = msg.source === 'guide';
          return (
            <Specimen
              key={msg.id}
              id={msg.id}
              size="md"
              pin={pinFor(msg.source)}
              className="bbp-card"
              data-source={msg.source}
              onClick={isGuide ? () => onMarkRead(msg.id) : undefined}
              style={{ cursor: isGuide ? 'pointer' : 'default' }}
            >
              <div className="bbp-card-source">{sourceLabel(msg.source)}</div>
              <p className="bbp-card-text">{messageText(msg)}</p>
            </Specimen>
          );
        })}
      </div>
    </div>
  );
}
