import { supabase } from './supabase';

const setupDatabase = async () => {
  try {
    // Create tables
    const { error: tablesError } = await supabase.from('emergency_alerts').select('id').limit(1);
    
    if (tablesError?.code === '42P01') { // Table doesn't exist
      const { error: createError } = await supabase.sql`
        CREATE TABLE IF NOT EXISTS public.emergency_alerts (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id),
          type VARCHAR(50) NOT NULL,
          message TEXT,
          status VARCHAR(20) DEFAULT 'active',
          location JSONB,
          metadata JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS public.groups (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          created_by UUID REFERENCES auth.users(id),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS public.group_members (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
          user_id UUID REFERENCES auth.users(id),
          role VARCHAR(20) DEFAULT 'member',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(group_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS public.messages (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          sender_id UUID REFERENCES auth.users(id),
          recipient_id UUID REFERENCES auth.users(id),
          group_id UUID REFERENCES public.groups(id),
          content TEXT NOT NULL,
          type VARCHAR(20) DEFAULT 'normal',
          read_by JSONB DEFAULT '[]'::jsonb,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          CHECK (
            (recipient_id IS NOT NULL AND group_id IS NULL) OR
            (recipient_id IS NULL AND group_id IS NOT NULL)
          )
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS emergency_alerts_user_id_idx ON public.emergency_alerts(user_id);
        CREATE INDEX IF NOT EXISTS emergency_alerts_type_idx ON public.emergency_alerts(type);
        CREATE INDEX IF NOT EXISTS emergency_alerts_status_idx ON public.emergency_alerts(status);
        CREATE INDEX IF NOT EXISTS emergency_alerts_created_at_idx ON public.emergency_alerts(created_at DESC);
        CREATE INDEX IF NOT EXISTS groups_created_by_idx ON public.groups(created_by);
        CREATE INDEX IF NOT EXISTS group_members_group_id_idx ON public.group_members(group_id);
        CREATE INDEX IF NOT EXISTS group_members_user_id_idx ON public.group_members(user_id);
        CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON public.messages(sender_id);
        CREATE INDEX IF NOT EXISTS messages_recipient_id_idx ON public.messages(recipient_id);
        CREATE INDEX IF NOT EXISTS messages_group_id_idx ON public.messages(group_id);
        CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages(created_at DESC);

        -- Enable RLS
        ALTER TABLE public.emergency_alerts ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

        -- Create policies
        CREATE POLICY "Enable read access for authenticated users"
          ON public.emergency_alerts FOR SELECT
          TO authenticated
          USING (true);

        CREATE POLICY "Enable insert access for authenticated users"
          ON public.emergency_alerts FOR INSERT
          TO authenticated
          WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Enable read access for all users"
          ON public.groups FOR SELECT
          TO authenticated
          USING (true);

        CREATE POLICY "Enable insert for authenticated users"
          ON public.groups FOR INSERT
          TO authenticated
          WITH CHECK (auth.uid() = created_by);

        CREATE POLICY "Enable read access for group members"
          ON public.group_members FOR SELECT
          TO authenticated
          USING (true);

        CREATE POLICY "Enable insert for authenticated users"
          ON public.group_members FOR INSERT
          TO authenticated
          WITH CHECK (
            auth.uid() = user_id OR
            EXISTS (
              SELECT 1 FROM public.group_members
              WHERE group_id = NEW.group_id
              AND user_id = auth.uid()
              AND role = 'admin'
            )
          );

        CREATE POLICY "Enable delete for group admins"
          ON public.group_members FOR DELETE
          TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM public.group_members
              WHERE group_id = group_members.group_id
              AND user_id = auth.uid()
              AND role = 'admin'
            ) OR auth.uid() = user_id
          );

        CREATE POLICY "Enable read access for message participants"
          ON public.messages FOR SELECT
          TO authenticated
          USING (
            auth.uid() = sender_id OR
            auth.uid() = recipient_id OR
            (
              group_id IS NOT NULL AND
              EXISTS (
                SELECT 1 FROM public.group_members
                WHERE group_id = messages.group_id
                AND user_id = auth.uid()
              )
            )
          );

        CREATE POLICY "Enable insert for authenticated users"
          ON public.messages FOR INSERT
          TO authenticated
          WITH CHECK (auth.uid() = sender_id);
      `;

      if (createError) {
        console.error('Error creating database schema:', createError);
      } else {
        console.log('Database schema created successfully');
      }
    }
  } catch (error) {
    console.error('Error during database setup:', error);
  }
};

export default setupDatabase;