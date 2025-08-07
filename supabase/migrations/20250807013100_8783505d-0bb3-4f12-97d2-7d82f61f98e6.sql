-- Add short_code column to rooms table for easier sharing
ALTER TABLE public.rooms 
ADD COLUMN short_code TEXT UNIQUE;

-- Create unique index for short_code
CREATE UNIQUE INDEX IF NOT EXISTS unique_short_code ON public.rooms (short_code);

-- Function to generate short codes
CREATE OR REPLACE FUNCTION public.generate_short_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check INTEGER;
BEGIN
  LOOP
    -- Generate 6-character alphanumeric code
    code := UPPER(
      SUBSTRING(
        MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) 
        FROM 1 FOR 6
      )
    );
    
    -- Check if code already exists
    SELECT COUNT(*) INTO exists_check 
    FROM public.rooms 
    WHERE short_code = code;
    
    -- If unique, return the code
    IF exists_check = 0 THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-generate short codes for new rooms
CREATE OR REPLACE FUNCTION public.set_room_short_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.short_code IS NULL THEN
    NEW.short_code := public.generate_short_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for room creation
DROP TRIGGER IF EXISTS trigger_set_room_short_code ON public.rooms;
CREATE TRIGGER trigger_set_room_short_code
  BEFORE INSERT ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.set_room_short_code();

-- Update existing rooms to have short codes
UPDATE public.rooms 
SET short_code = public.generate_short_code() 
WHERE short_code IS NULL;