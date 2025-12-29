"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

export function UserMenu() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  if (status === "loading") {
    return <div className="w-8 h-8 bg-[#ebebeb] rounded-full animate-pulse" />;
  }

  if (!session) {
    return (
      <Link
        href="/auth/login"
        className="text-sm text-[#666] hover:text-[#3a3a3a] transition-colors"
      >
        Sign In
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-[#666] hover:text-[#3a3a3a] transition-colors"
      >
        {session.user?.image ? (
          <img
            src={session.user.image}
            alt=""
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#3a3a3a] flex items-center justify-center text-white text-xs font-medium">
            {session.user?.name?.[0]?.toUpperCase() || "U"}
          </div>
        )}
        <span className="hidden sm:inline">{session.user?.name}</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white border border-[#ebebeb] shadow-lg z-50">
            {session.user?.username && (
              <Link
                href={`/profile/${session.user.username}`}
                onClick={() => setIsOpen(false)}
                className="block px-4 py-2 text-sm text-[#3a3a3a] hover:bg-[#f6f6f6]"
              >
                My Profile
              </Link>
            )}
            <Link
              href="/collection"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-sm text-[#3a3a3a] hover:bg-[#f6f6f6]"
            >
              My Collection
            </Link>
            <Link
              href="/contribute"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-sm text-[#3a3a3a] hover:bg-[#f6f6f6]"
            >
              Contribute
            </Link>
            {(session.user?.role === "admin" || session.user?.role === "moderator") && (
              <>
                <hr className="border-[#ebebeb]" />
                <Link
                  href="/admin/submissions"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-sm text-[#3a3a3a] hover:bg-[#f6f6f6]"
                >
                  Review Submissions
                </Link>
              </>
            )}
            <hr className="border-[#ebebeb]" />
            <button
              onClick={() => signOut()}
              className="block w-full text-left px-4 py-2 text-sm text-[#666] hover:bg-[#f6f6f6]"
            >
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
