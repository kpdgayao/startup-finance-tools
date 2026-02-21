import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ToolSidebar } from "@/components/layout/tool-sidebar";

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col lg:flex-row">
        <ToolSidebar />
        <main id="main-content" className="flex-1 overflow-auto">
          <div className="mx-auto px-4 py-6 lg:py-8 max-w-5xl">
            {children}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
