
"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Feather, Code2, LayoutTemplate, Image, Bolt, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import FeatureTourGuide from "@/components/shared/FeatureTourGuide";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const creationOptions = [
    {
      id: "feature-written-content",
      icon: <Feather className="h-8 w-8" />,
      title: "Written Content",
      subtitle: "Blog posts, emails, social media updates",
      href: "/written-content",
    },
    {
      id: "feature-prompt-generator",
      icon: <Bolt className="h-8 w-8" />,
      title: "Prompt Generator",
      subtitle: "Craft optimized prompts for any task",
      href: "/prompt-generator",
    },
    {
      id: "feature-web-page-app",
      icon: <LayoutTemplate className="h-8 w-8" />,
      title: "Web Page / App",
      subtitle: "Full landing pages, dashboards, etc.",
      href: "/component-wizard",
    },
    {
      id: "feature-image-generator",
      icon: <Image className="h-8 w-8" />,
      title: "Image Generator",
      subtitle: "Create unique images from text",
      href: "/image-generator",
    },
    {
      id: "feature-structured-data",
      icon: <Code2 className="h-8 w-8" />,
      title: "Structured Data",
      subtitle: "JSON for components, CSV lists",
      href: "/structured-data",
    },
  ];

  return (
    <DashboardLayout>
      <main className="flex flex-1 flex-col p-4 md:p-8">
        <div className="w-full max-w-5xl">
          <div className="mb-12">
            <h1 className="text-4xl font-bold md:text-5xl">Creation Hub</h1>
            <p className="mt-2 text-lg text-muted-foreground">What would you like to create today?</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {creationOptions.map((option, index) => (
              <Link
                href={option.href}
                key={option.title}
                id={option.id}
                className="group"
              >
                <Card className="flex h-full transform flex-col justify-between p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-primary/80 rounded-xl">
                  <div>
                    <div className="mb-4 text-primary">{option.icon}</div>
                    <CardHeader className="p-0">
                      <CardTitle className="text-xl font-semibold transition-colors duration-300 group-hover:text-primary">
                        {option.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="mt-2 p-0">
                      <p className="text-muted-foreground">{option.subtitle}</p>
                    </CardContent>
                  </div>
                  <div className="mt-4 flex items-center text-sm font-medium text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    Start Creating <ArrowRight className="ml-2 h-4 w-4" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <FeatureTourGuide />
    </DashboardLayout>
  );
}
