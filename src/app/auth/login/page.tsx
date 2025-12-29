"use client";

import { useActionState } from "react";
import { login } from "@/lib/actions/auth";
import Link from "next/link";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="border border-[#ebebeb] p-8">
          <h1 className="text-2xl font-semibold text-[#3a3a3a] mb-6">Sign In</h1>

          <form action={formAction} className="space-y-4">
            {state?.error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
                {state.error}
              </div>
            )}

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
                className="w-full border border-[#ebebeb] px-4 py-2 focus:outline-none focus:border-[#3a3a3a]"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-[#3a3a3a] text-white py-2 px-4 hover:bg-[#555] transition-colors disabled:opacity-50"
            >
              {isPending ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-[#666]">
            Don&apos;t have an account?{" "}
            <Link href="/auth/register" className="text-[#3a3a3a] underline hover:no-underline">
              Register
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
