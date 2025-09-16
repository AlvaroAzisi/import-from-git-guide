import React from 'react';

export const ChatList: React.FC = () => {
  const items = [
    { id: '1', name: 'General Study Group', last: 'Welcome to the group!', time: '2m' },
    { id: '2', name: 'Alice', last: 'See you tomorrow!', time: '1h' },
  ];
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li
          key={i.id}
          className="rounded-2xl p-3 hover:bg-white/40 dark:hover:bg-gray-800/40 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <p className="font-medium">{i.name}</p>
            <span className="text-xs text-muted-foreground">{i.time}</span>
          </div>
          <p className="text-sm text-muted-foreground truncate">{i.last}</p>
        </li>
      ))}
    </ul>
  );
};
