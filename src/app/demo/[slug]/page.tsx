import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DemoExperience } from "@/components/demo-experience";
import { getPulseTemplate } from "@/lib/pulse-templates";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const template = getPulseTemplate((await params).slug); return { title: template ? `${template.name} — PulseLink demo` : "Demo not found", description: template?.description }; }
export default async function DemoPage({ params }: Props) { const template = getPulseTemplate((await params).slug); if (!template) notFound(); return <DemoExperience template={template} />; }
