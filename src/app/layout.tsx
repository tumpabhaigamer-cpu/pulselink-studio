import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./pulse.css";
import "./widgets.css";
import "./light-studio.css";
import "./lead-drawer.css";
import "./outreach.css";

export const metadata: Metadata = {
  title: "PulseLink Studio — make your link an experience",
  description: "Build an interactive, motion-rich home for everything you do.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
