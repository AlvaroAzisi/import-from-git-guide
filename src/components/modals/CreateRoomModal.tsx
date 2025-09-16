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
        if (onSuccess) onSuccess(result.data);
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
          {/* Modal content here */}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CreateRoomModal;
