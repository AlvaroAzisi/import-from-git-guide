CREATE POLICY "Other users can view user badges" ON "public"."user_badges" FOR SELECT USING (true);
CREATE POLICY "Users can view their own badges" ON "public"."user_badges" FOR SELECT USING (("auth"."uid"() = "user_id"));
ALTER TABLE "public"."user_badges" ENABLE ROW LEVEL SECURITY;