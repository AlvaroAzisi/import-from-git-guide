import React, { useState } from 'react';

interface MessageComposerProps {
  onSend: (text: string) => Promise<void> | void;
  disabled?: boolean;
}

const MessageComposer: React.FC<MessageComposerProps> = ({ onSend, disabled }) => {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!text.trim() || disabled) return;
    try {
      setSending(true);
      await onSend(text);
      setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message..."
        className="flex-1 px-3 py-2 border rounded dark:bg-gray-800"
      />
      <button onClick={submit} disabled={sending || disabled} className="px-4 py-2 bg-blue-500 text-white rounded">
        {sending ? 'Sending…' : 'Send'}
      </button>
    </div>
  );
};

export default MessageComposer;
