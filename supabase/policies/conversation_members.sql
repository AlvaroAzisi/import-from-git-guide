CREATE POLICY "Members can insert their own membership" ON "public"."conversation_members" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));
CREATE POLICY "Users can view their own membership" ON "public"."conversation_members" FOR SELECT USING (("user_id" = "auth"."uid"()));
ALTER TABLE "public"."conversation_members" ENABLE ROW LEVEL SECURITY;