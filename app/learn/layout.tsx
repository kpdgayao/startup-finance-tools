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
        <main className="flex-1 overflow-auto">
          <div className="mx-auto px-4 py-6 lg:py-8 max-w-3xl">
            {children}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
