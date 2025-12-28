import { db, magazines, magazinePages } from "@/lib/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { OcrEditor } from "./editor";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
};

export default async function OcrEditorPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { page: pageParam } = await searchParams;
  const magazineId = parseInt(id, 10);

  const magazine = db
    .select()
    .from(magazines)
    .where(eq(magazines.id, magazineId))
    .get();

  if (!magazine) {
    notFound();
  }

  const pages = db
    .select()
    .from(magazinePages)
    .where(eq(magazinePages.magazineId, magazineId))
    .all()
    .sort((a, b) => a.pageNumber - b.pageNumber);

  if (pages.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href={`/admin/magazines/${magazineId}`}
            className="text-sm text-[#666] hover:text-[#3a3a3a]"
          >
            ← Back to Magazine
          </Link>
        </div>
        <div className="border border-[#ebebeb] p-8 text-center">
          <p className="text-[#666] mb-4">No pages found. Run OCR first.</p>
          <Link
            href={`/admin/magazines/${magazineId}`}
            className="border border-[#3a3a3a] px-4 py-2 text-sm font-medium hover:bg-[#3a3a3a] hover:text-white transition-colors"
          >
            Go to Magazine Controls
          </Link>
        </div>
      </div>
    );
  }

  const pagesData = pages.map((p) => ({
    pageNumber: p.pageNumber,
    imagePath: p.imagePath,
    textContent: p.textContent,
  }));

  // Find initial page index from query param
  const initialPageNumber = pageParam ? parseInt(pageParam, 10) : 1;
  const initialIndex = pages.findIndex((p) => p.pageNumber === initialPageNumber);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href={`/admin/magazines/${magazineId}`}
            className="text-sm text-[#666] hover:text-[#3a3a3a]"
          >
            ← Back to Magazine
          </Link>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">
            Edit OCR Text: {magazine.title}
          </h1>
        </div>
        <div className="text-sm text-[#666]">{pages.length} pages</div>
      </div>

      <OcrEditor magazineId={magazineId} pages={pagesData} initialIndex={initialIndex >= 0 ? initialIndex : 0} />
    </div>
  );
}
