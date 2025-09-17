CREATE POLICY "Other users can view user streaks" ON "public"."user_streaks" FOR SELECT USING (true);
CREATE POLICY "Users can view their own streaks" ON "public"."user_streaks" FOR SELECT USING (("auth"."uid"() = "user_id"));
ALTER TABLE "public"."user_streaks" ENABLE ROW LEVEL SECURITY;