import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, BookOpen, Lock, Globe } from 'lucide-react';
import { useRoomOperations } from '../../lib/roomOperations';
import { useToast } from '../../hooks/useToast';
import { useLanguage } from '../../hooks/useLanguage';

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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="modal-content"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">{t('create_room_modal.title')}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                <BookOpen className="inline-block mr-2" size={16} />
                {t('create_room_modal.room_name')}
              </label>
              <input
                type="text"
                name="name"
                id="name"
                value={formData.name}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                required
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                {t('create_room_modal.description')}
              </label>
              <textarea
                name="description"
                id="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
              ></textarea>
            </div>
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                <BookOpen className="inline-block mr-2" size={16} />
                {t('create_room_modal.subject')}
              </label>
              <select
                name="subject"
                id="subject"
                value={formData.subject}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
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
            <div>
              <label htmlFor="max_members" className="block text-sm font-medium text-gray-700">
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
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                name="is_public"
                id="is_public"
                checked={formData.is_public}
                onChange={() => setFormData((prev) => ({ ...prev, is_public: !prev.is_public }))}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="is_public" className="ml-2 block text-sm text-gray-900">
                {formData.is_public ? <Globe className="inline-block mr-1" size={16} /> : <Lock className="inline-block mr-1" size={16} />}
                {t('create_room_modal.is_public')}
              </label>
            </div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={loading}
            >
              {loading ? t('common.creating') : t('create_room_modal.create_button')}
            </button>
          </form>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CreateRoomModal;
