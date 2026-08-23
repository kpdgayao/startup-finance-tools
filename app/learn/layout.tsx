import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { LearnSidebar } from "@/components/layout/learn-sidebar";

export default function LearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col lg:flex-row">
        <LearnSidebar />
        {/* min-w-0 rather than overflow-auto — see the note in
            app/tools/layout.tsx. A scroll container here hides overflow from
            every check instead of surfacing it. */}
        <main id="main-content" className="flex-1 min-w-0">
          <div className="mx-auto px-4 py-6 lg:py-8 max-w-3xl">
            {children}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
