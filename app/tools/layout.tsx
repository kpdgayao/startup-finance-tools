import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ToolSidebar } from "@/components/layout/tool-sidebar";
import { ErrorBoundary } from "@/components/shared/error-boundary";

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
        {/* min-w-0, NOT overflow-auto. Both let this flex item shrink below
            its content, but `overflow-auto` also makes <main> a scroll
            container — and that hides overflow instead of showing it. A 900px
            element inside here leaves document.scrollWidth at a clean 375 under
            overflow-auto, so every audit and every devtools check reports the
            page as fine while it quietly slides sideways on a phone. Under
            min-w-0 the same element pushes the document to 900 and the problem
            announces itself. Wide content belongs in its own
            `overflow-x-auto` wrapper, as the tables here already are. */}
        <main id="main-content" className="flex-1 min-w-0">
          <div className="mx-auto px-4 py-6 lg:py-8 max-w-5xl">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
