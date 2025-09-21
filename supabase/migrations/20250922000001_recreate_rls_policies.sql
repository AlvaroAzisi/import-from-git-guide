CREATE POLICY "All users can view badges" ON "public"."badges" FOR SELECT USING (true);

ALTER TABLE "public"."badges" ENABLE ROW LEVEL SECURITY;CREATE POLICY "Members can insert their own membership" ON "public"."conversation_members" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));
CREATE POLICY "Users can view their own membership" ON "public"."conversation_members" FOR SELECT USING (("user_id" = "auth"."uid"()));
ALTER TABLE "public"."conversation_members" ENABLE ROW LEVEL SECURITY;CREATE POLICY "Users can view conversations they are a member of" ON "public"."conversations" FOR SELECT USING (("id" IN ( SELECT "conversation_members"."conversation_id"
   FROM "public"."conversation_members"
  WHERE ("conversation_members"."user_id" = "auth"."uid"()))));
ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;CREATE POLICY "Participants can delete friend requests" ON "public"."friends" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "from_user") OR ("auth"."uid"() = "to_user")));
CREATE POLICY "Participants can update friend requests" ON "public"."friends" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "from_user") OR ("auth"."uid"() = "to_user"))) WITH CHECK ((("auth"."uid"() = "from_user") OR ("auth"."uid"() = "to_user")));
CREATE POLICY "Users can read own friends" ON "public"."friends" FOR SELECT USING ((("auth"."uid"() = "from_user") OR ("auth"."uid"() = "to_user")));
CREATE POLICY "Users can send friend requests" ON "public"."friends" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "from_user"));
ALTER TABLE "public"."friends" ENABLE ROW LEVEL SECURITY;CREATE POLICY "Users can update their own messages" ON "public"."messages" FOR UPDATE USING (("sender_id" = "auth"."uid"()));
ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;CREATE POLICY "Users can update their notifications" ON "public"."notifications" FOR UPDATE USING (("user_id" = "auth"."uid"()));
CREATE POLICY "Users can view their notifications" ON "public"."notifications" FOR SELECT USING (("user_id" = "auth"."uid"()));
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));
CREATE POLICY "Users can read own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));
CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));
CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));
CREATE POLICY "Users can view public profile data" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((NOT "is_deleted"));
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;CREATE POLICY "Members can view room members (secure)" ON "public"."room_members" FOR SELECT TO "authenticated" USING ("public"."is_room_member_secure"("room_id", "auth"."uid"()));
CREATE POLICY "Room creators can manage members" ON "public"."room_members" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."rooms"
  WHERE (("rooms"."id" = "room_members"."room_id") AND ("rooms"."created_by" = "auth"."uid"())))));
CREATE POLICY "Room creators can remove members" ON "public"."room_members" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."rooms"
  WHERE (("rooms"."id" = "room_members"."room_id") AND ("rooms"."created_by" = "auth"."uid"())))));
CREATE POLICY "Users can join rooms" ON "public"."room_members" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can leave rooms" ON "public"."room_members" FOR DELETE USING (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can read room members" ON "public"."room_members" FOR SELECT USING (("room_id" IN ( SELECT "rooms"."id"
   FROM "public"."rooms"
  WHERE ("rooms"."created_by" = "auth"."uid"()))));
CREATE POLICY "Users can view own memberships" ON "public"."room_members" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));
ALTER TABLE "public"."room_members" ENABLE ROW LEVEL SECURITY;CREATE POLICY "Anyone can view public rooms" ON "public"."rooms" FOR SELECT USING (true);
CREATE POLICY "Creators can delete own rooms" ON "public"."rooms" FOR DELETE USING (("auth"."uid"() = "created_by"));
CREATE POLICY "Creators can update own rooms" ON "public"."rooms" FOR UPDATE USING (("auth"."uid"() = "created_by"));
CREATE POLICY "Users can create rooms" ON "public"."rooms" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));
CREATE POLICY "Users can read accessible rooms" ON "public"."rooms" FOR SELECT USING ((("is_public" = true) OR ("created_by" = "auth"."uid"())));
CREATE POLICY "Users can update own rooms" ON "public"."rooms" FOR UPDATE USING (("created_by" = "auth"."uid"()));
ALTER TABLE "public"."rooms" ENABLE ROW LEVEL SECURITY;CREATE POLICY "Users can view their own subscriptions" ON "public"."subscriptions" FOR SELECT USING (("auth"."uid"() = "user_id"));
ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;CREATE POLICY "Other users can view user badges" ON "public"."user_badges" FOR SELECT USING (true);
CREATE POLICY "Users can view their own badges" ON "public"."user_badges" FOR SELECT USING (("auth"."uid"() = "user_id"));
ALTER TABLE "public"."user_badges" ENABLE ROW LEVEL SECURITY;CREATE POLICY "Other users can view user streaks" ON "public"."user_streaks" FOR SELECT USING (true);
CREATE POLICY "Users can view their own streaks" ON "public"."user_streaks" FOR SELECT USING (("auth"."uid"() = "user_id"));
ALTER TABLE "public"."user_streaks" ENABLE ROW LEVEL SECURITY;