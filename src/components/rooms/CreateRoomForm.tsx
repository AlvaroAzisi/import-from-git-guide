import React, { useState } from 'react';
import { RoomManager } from '../../lib/roomManager';
import { useToast } from '../../hooks/useToast';

const CreateRoomForm: React.FC = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await RoomManager.createAndJoinRoom({
      name,
      description,
      is_public: isPublic,
    });

    setLoading(false);

    if (result.success) {
      toast({ title: 'Room created!', description: `Welcome to ${result.room?.name}` });
      // You might want to redirect the user to the new room here
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Create a New Room</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="room-name">
            Room Name
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="room-name"
            type="text"
            placeholder="My Awesome Room"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="room-description">
            Description
          </label>
          <textarea
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="room-description"
            placeholder="A brief description of your room."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="form-checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            <span className="ml-2">Public Room</span>
          </label>
        </div>
        <div className="flex items-center">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Room'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateRoomForm;
