import { redirect } from "next/navigation";
import { requireMemberUser } from "@/lib/member-auth";
import { isMemberProfileComplete } from "@/lib/member-profile-validation";

export async function requireCompleteMemberUser(returnTo = "/account") {
  const memberUser = await requireMemberUser(returnTo);

  if (!isMemberProfileComplete(memberUser)) {
    redirect("/account/onboarding");
  }

  return memberUser;
}
