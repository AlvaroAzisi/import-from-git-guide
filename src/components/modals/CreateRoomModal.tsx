import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, BookOpen, Lock, Globe } from 'lucide-react';
import { useRoomOperations } from '../../lib/roomOperations';
import { useToast } from '../../hooks/useToast';
import { useLanguage } from '../../hooks/useLanguage';
import { FloatingPanel } from '../ui/floating-panel';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (roomData: any) => void;
}

const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { createAndJoinRoom } = useRoomOperations();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subject: '',
    max_members: 10,
    is_public: true,
  });

  const subjects = [
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'Computer Science',
    'English',
    'History',
    'Geography',
    'Economics',
    'Psychology',
    'Art',
    'Music',
    'Philosophy',
    'Literature',
    'Engineering',
  ];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 1 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.subject) {
      toast({
        title: t('common.error'),
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await createAndJoinRoom(formData);

      if (result.success) {
        toast({
          title: t('common.success'),
          description: 'Room created successfully!',
        });
        if (onSuccess && result.room) onSuccess(result.room);
        onClose();
      } else {
        toast({
          title: t('common.error'),
          description: result.error || 'Failed to create room',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: t('common.error'),
        description: 'Unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <FloatingPanel
      isOpen={isOpen}
      onClose={onClose}
      title={t('create_room_modal.title')}
      size="lg"
      position="center"
    >
      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
        {/* Room Name */}
        <div>
          <label htmlFor="name" className="flex items-center text-sm font-medium text-foreground/80 mb-2">
            <BookOpen className="inline-block mr-2" size={16} />
            {t('create_room_modal.room_name')}
          </label>
          <input
            type="text"
            name="name"
            id="name"
            value={formData.name}
            onChange={handleInputChange}
            className="w-full rounded-xl border border-border/50 bg-background/60 backdrop-blur-sm px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            placeholder="Enter room name"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-foreground/80 mb-2">
            {t('create_room_modal.description')}
          </label>
          <textarea
            name="description"
            id="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={3}
            className="w-full rounded-xl border border-border/50 bg-background/60 backdrop-blur-sm px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none"
            placeholder="Describe your study room"
          />
        </div>

        {/* Subject */}
        <div>
          <label htmlFor="subject" className="flex items-center text-sm font-medium text-foreground/80 mb-2">
            <BookOpen className="inline-block mr-2" size={16} />
            {t('create_room_modal.subject')}
          </label>
          <select
            name="subject"
            id="subject"
            value={formData.subject}
            onChange={handleInputChange}
            className="w-full rounded-xl border border-border/50 bg-background/60 backdrop-blur-sm px-4 py-2.5 text-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            required
          >
            <option value="">{t('create_room_modal.select_subject')}</option>
            {subjects.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>

        {/* Max Members */}
        <div>
          <label htmlFor="max_members" className="flex items-center text-sm font-medium text-foreground/80 mb-2">
            <Users className="inline-block mr-2" size={16} />
            {t('create_room_modal.max_members')}
          </label>
          <input
            type="number"
            name="max_members"
            id="max_members"
            value={formData.max_members}
            onChange={handleInputChange}
            min="1"
            className="w-full rounded-xl border border-border/50 bg-background/60 backdrop-blur-sm px-4 py-2.5 text-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
          />
        </div>

        {/* Public/Private Toggle */}
        <motion.div
          className="flex items-center gap-3 p-4 rounded-xl bg-card/30 backdrop-blur-sm border border-border/30"
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.2 }}
        >
          <input
            type="checkbox"
            name="is_public"
            id="is_public"
            checked={formData.is_public}
            onChange={() => setFormData((prev) => ({ ...prev, is_public: !prev.is_public }))}
            className="h-5 w-5 rounded border-border/50 text-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
          />
          <label htmlFor="is_public" className="flex items-center text-sm text-foreground cursor-pointer select-none flex-1">
            {formData.is_public ? (
              <Globe className="inline-block mr-2 text-primary" size={18} />
            ) : (
              <Lock className="inline-block mr-2 text-muted-foreground" size={18} />
            )}
            <span className="font-medium">{t('create_room_modal.is_public')}</span>
            <span className="ml-2 text-xs text-muted-foreground">
              {formData.is_public ? '(Anyone can join)' : '(Invite only)'}
            </span>
          </label>
        </motion.div>

        {/* Submit Button */}
        <motion.button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-6 rounded-xl bg-primary text-primary-foreground font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          whileHover={{ scale: loading ? 1 : 1.02 }}
          whileTap={{ scale: loading ? 1 : 0.98 }}
        >
          {loading ? t('common.creating') : t('create_room_modal.create_button')}
        </motion.button>
      </form>
    </FloatingPanel>
  );
};

export default CreateRoomModal;
