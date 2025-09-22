import React, { useState } from 'react';
import { createGroup } from '../../lib/friends';
import { useToast } from '../../hooks/useToast';

interface CreateGroupFormProps {
  onSuccess?: () => void;
}

const CreateGroupForm: React.FC<CreateGroupFormProps> = ({ onSuccess }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    const { success, error } = await createGroup(name, description);
    setLoading(false);

    if (success) {
      toast({ title: 'Success', description: 'Group created successfully!' });
      setName('');
      setDescription('');
      onSuccess?.();
    } else {
      toast({ title: 'Error', description: error || 'Failed to create group.', variant: 'destructive' });
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Create a New Group</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="group-name">
            Group Name
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="group-name"
            type="text"
            placeholder="My Awesome Group"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="group-description">
            Description
          </label>
          <textarea
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="group-description"
            placeholder="What's this group about?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="flex items-center">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateGroupForm;
