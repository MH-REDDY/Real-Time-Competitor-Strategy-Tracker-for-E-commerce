import { useState } from 'react';
import { Bot } from 'lucide-react';
import { styles } from '../styles/adminStyles';

const FloatingBotButton = ({ onClick }) => {
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);

  return (
    <button
      style={{
        ...styles.fab,
        ...(hover ? styles.fabHover : {}),
        ...(active ? styles.fabActive : {}),
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setActive(false); }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      onClick={onClick}
      aria-label="Open Assistant"
    >
      <Bot size={22} />
    </button>
  );
};

export default FloatingBotButton;
