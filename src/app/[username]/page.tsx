import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PulsePublic } from "@/components/pulse-public";
import { getPublicProfile } from "@/lib/store";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const data = await getPublicProfile(username);
  if (!data) return { title: "Profile not found | PulseLink" };
  return { title: `${data.profile.displayName} | PulseLink`, description: data.profile.bio.replace(/\n/g, " ") };
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const data = await getPublicProfile(username);
  if (!data) notFound();
  const payload = {
    props: { pageProps: {
      account: { id: data.profile.id, username: data.profile.username, tier: data.profile.tier, isActive: true, profilePictureUrl: data.profile.avatarUrl, pageTitle: data.profile.displayName, description: data.profile.bio },
      theme: data.profile.themeConfig,
      socialIcons: data.profile.socialLinks,
      links: data.links.map((link) => ({ ...link, gates: link.lockConfig })),
    } },
  };
  const json = JSON.stringify(payload).replace(/</g, "\\u003c");
  return <><script id="__NEXT_DATA__" type="application/json" dangerouslySetInnerHTML={{ __html: json }} /><PulsePublic data={data} /></>;
}
