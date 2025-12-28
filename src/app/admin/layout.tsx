import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-[#3a3a3a]">
      <header className="border-b border-[#ebebeb]">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="text-xl font-semibold tracking-tight"
              >
                Admin
              </Link>
              <span className="text-[#999]">|</span>
              <Link
                href="/"
                className="text-sm text-[#666] hover:text-[#3a3a3a]"
              >
                View Site
              </Link>
            </div>
            <Link
              href="/admin/upload"
              className="border border-[#3a3a3a] px-4 py-2 text-sm font-medium hover:bg-[#3a3a3a] hover:text-white transition-colors"
            >
              Upload PDF
            </Link>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
