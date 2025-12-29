"use client";

import { useActionState } from "react";
import { register } from "@/lib/actions/auth";
import Link from "next/link";

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(register, null);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="border border-[#ebebeb] p-8">
          <h1 className="text-2xl font-semibold text-[#3a3a3a] mb-6">Create Account</h1>

          <form action={formAction} className="space-y-4">
            {state?.error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
                {state.error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-[#666] mb-1">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                required
                minLength={3}
                pattern="[a-zA-Z0-9_]+"
                className="w-full border border-[#ebebeb] px-4 py-2 focus:outline-none focus:border-[#3a3a3a]"
                placeholder="skater123"
              />
              <p className="mt-1 text-xs text-[#999]">Letters, numbers, and underscores only</p>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#666] mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                className="w-full border border-[#ebebeb] px-4 py-2 focus:outline-none focus:border-[#3a3a3a]"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#666] mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                minLength={8}
                className="w-full border border-[#ebebeb] px-4 py-2 focus:outline-none focus:border-[#3a3a3a]"
              />
              <p className="mt-1 text-xs text-[#999]">At least 8 characters</p>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-[#3a3a3a] text-white py-2 px-4 hover:bg-[#555] transition-colors disabled:opacity-50"
            >
              {isPending ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-[#666]">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-[#3a3a3a] underline hover:no-underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
