"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function requestPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
    });

    if (error) {
      console.error("[requestPasswordReset]", error);
      return { success: false, error: "Failed to send reset email" };
    }

    return { success: true };
  } catch (err) {
    console.error("[requestPasswordReset]", err);
    return { success: false, error: "Something went wrong" };
  }
}

export async function resetPassword(password: string, code: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return { success: false, error: "Invalid or expired reset link" };
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      return { success: false, error: "Failed to update password" };
    }

    redirect("/app/editor");
  } catch (err) {
    console.error("[resetPassword]", err);
    return { success: false, error: "Something went wrong" };
  }
}
