import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QuietHero } from "@/components/home/quiet-hero";
import { TOOLS, TOOL_GROUPS } from "@/lib/constants";
import { iconMap } from "@/lib/icon-map";



export const metadata: Metadata = {
  title: { absolute: "Startup Finance Toolkit | IOL Inc." },
  description: "Interactive financial tools for Filipino startup founders. Valuation calculators, equity simulators, burn rate analysis, and more.",
  openGraph: {
    title: "Startup Finance Toolkit | IOL Inc.",
    description: "Interactive financial tools for Filipino startup founders.",
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        <QuietHero />

        <section className="container mx-auto px-4 pb-16 space-y-10">
          {TOOL_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {group.label}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.tools.map((toolId) => {
                  const tool = TOOLS.find((t) => t.id === toolId);
                  if (!tool) return null;
                  const Icon = iconMap[tool.icon as keyof typeof iconMap];
                  return (
                    <Link key={tool.id} href={tool.href}>
                      <Card className="h-full hover:border-primary/50 transition-all cursor-pointer">
                        <CardHeader>
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-md bg-primary/10">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <CardTitle className="text-lg">{tool.name}</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <CardDescription>{tool.description}</CardDescription>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      </main>
      <Footer />
    </div>
  );
}
