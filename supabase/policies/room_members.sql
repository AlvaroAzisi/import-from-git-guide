CREATE POLICY "Members can view room members (secure)" ON "public"."room_members" FOR SELECT TO "authenticated" USING ("public"."is_room_member_secure"("room_id", "auth"."uid"()));
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
ALTER TABLE "public"."room_members" ENABLE ROW LEVEL SECURITY;