import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getPendingSubmissions } from "@/lib/actions/contribute";
import { SubmissionsList } from "./submissions-list";

export default async function AdminSubmissionsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  // Check if user is moderator or admin
  const user = db.select().from(users).where(eq(users.id, session.user.id)).get();
  if (!user || !["moderator", "admin"].includes(user.role || "")) {
    redirect("/");
  }

  const submissions = await getPendingSubmissions();

  return (
    <div className="min-h-screen bg-white text-[#3a3a3a]">
      <header className="border-b border-[#ebebeb]">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-semibold tracking-tight">Review Submissions</h1>
          <p className="mt-1 text-[#666]">
            {submissions.length} pending submission{submissions.length !== 1 && "s"}
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {submissions.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#666]">No pending submissions.</p>
          </div>
        ) : (
          <SubmissionsList submissions={submissions} />
        )}
      </main>
    </div>
  );
}
