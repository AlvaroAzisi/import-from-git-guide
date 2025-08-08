import React from 'react';
import { motion } from 'framer-motion';

export const ChatWindow: React.FC = () => {
  const [messages] = React.useState([
    { id: 'm1', author: 'You', text: 'Hello!', at: new Date().toLocaleTimeString() },
    { id: 'm2', author: 'Alice', text: 'Hi there 👋', at: new Date().toLocaleTimeString() },
  ]);

  return (
    <div className="backdrop-blur-md bg-white/30 dark:bg-gray-900/30 rounded-3xl border border-white/20 dark:border-gray-700/20 shadow-lg h-[75vh] flex flex-col">
      <header className="p-6 border-b border-white/20 dark:border-gray-700/20">
        <h3 className="font-semibold">Conversation</h3>
      </header>
      <section className="flex-1 overflow-y-auto p-6 space-y-3">
        {messages.map((m, idx) => (
          <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.1, delay: idx * 0.03 }} className="max-w-md rounded-2xl px-4 py-2 bg-white/40 dark:bg-gray-800/40">
            <p className="text-xs text-muted-foreground">{m.author} • {m.at}</p>
            <p>{m.text}</p>
          </motion.div>
        ))}
      </section>
      <footer className="p-4 border-t border-white/20 dark:border-gray-700/20">
        <form className="flex gap-2">
          <input className="flex-1 rounded-xl px-3 py-2 bg-white/60 dark:bg-gray-800/60 outline-none" placeholder="Type a message..." />
          <button type="submit" className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">Send</button>
        </form>
      </footer>
    </div>
  );
};
