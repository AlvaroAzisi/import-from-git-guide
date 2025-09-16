export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '12.2.3 (519615d)';
  };
  public: {
    Tables: {
      friends: {
        Row: {
          created_at: string | null;
          from_user: string | null;
          id: string;
          status: string | null;
          to_user: string | null;
        };
        Insert: {
          created_at?: string | null;
          from_user?: string | null;
          id?: string;
          status?: string | null;
          to_user?: string | null;
        };
        Update: {
          created_at?: string | null;
          from_user?: string | null;
          id?: string;
          status?: string | null;
          to_user?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'friends_from_user_fkey';
            columns: ['from_user'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'friends_to_user_fkey';
            columns: ['to_user'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
          attachments: Json | null;
          content: string;
          conversation_id: string;
        };
        // ...other Insert, Update, Relationships definitions...
      };
    };
  };
};
