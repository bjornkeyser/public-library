import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserSubmissions } from "@/lib/actions/contribute";
import { ContributeForm } from "./contribute-form";
import Link from "next/link";

export default async function ContributePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const submissions = await getUserSubmissions();

  return (
    <div className="min-h-screen bg-white text-[#3a3a3a]">
      <header className="border-b border-[#ebebeb]">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-semibold tracking-tight">Contribute</h1>
          <p className="mt-1 text-[#666]">
            Help build the archive by adding magazines and videos
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
          {/* Form */}
          <div>
            <ContributeForm />
          </div>

          {/* Sidebar: Your Submissions */}
          <div>
            <h2 className="text-lg font-semibold uppercase tracking-wide mb-4">
              Your Submissions
            </h2>
            {submissions.length === 0 ? (
              <p className="text-[#666] text-sm">No submissions yet.</p>
            ) : (
              <div className="space-y-3">
                {submissions.map((item) => (
                  <div
                    key={item.id}
                    className="border border-[#ebebeb] p-3"
                  >
                    <div className="flex items-start gap-3">
                      {item.coverImage && (
                        <img
                          src={item.coverImage}
                          alt=""
                          className="w-12 h-16 object-cover bg-[#f6f6f6]"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {item.title} {item.issue && `#${item.issue}`}
                        </div>
                        <div className="text-xs text-[#666]">
                          {item.mediaType} · {item.year}
                        </div>
                        <div className={`text-xs mt-1 ${
                          item.status === "published" ? "text-green-600" :
                          item.status === "pending" ? "text-amber-600" :
                          "text-[#999]"
                        }`}>
                          {item.status === "published" ? "Published" :
                           item.status === "pending" ? "Pending review" :
                           item.status}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-[#ebebeb]">
              <h3 className="text-sm font-medium mb-2">Contribution Guidelines</h3>
              <ul className="text-xs text-[#666] space-y-1">
                <li>• Include accurate year and issue number</li>
                <li>• Upload a clear cover image if possible</li>
                <li>• Check for duplicates before submitting</li>
                <li>• All submissions are reviewed by moderators</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
