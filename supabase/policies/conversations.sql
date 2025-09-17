CREATE POLICY "Users can view conversations they are a member of" ON "public"."conversations" FOR SELECT USING (("id" IN ( SELECT "conversation_members"."conversation_id"
   FROM "public"."conversation_members"
  WHERE ("conversation_members"."user_id" = "auth"."uid"()))));
ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;