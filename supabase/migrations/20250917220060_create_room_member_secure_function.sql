CREATE OR REPLACE FUNCTION public.is_room_member_secure(room_id uuid, user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.room_members WHERE room_id = is_room_member_secure.room_id AND user_id = is_room_member_secure.user_id);
END;
$function$;