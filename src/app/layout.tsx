import type { Metadata, Viewport } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import SwRegister from "@/components/SwRegister";
import { getUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Masterpop",
  description: "Track your Popmaster scores with friends",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Masterpop", statusBarStyle: "black-translucent" },
};
export const viewport: Viewport = { themeColor: "#0f1420", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  return (
    <html lang="en-GB">
      <body>
        <main>{children}</main>
        {user && <Nav isAdmin={user.is_admin} />}
        <SwRegister />
      </body>
    </html>
  );
}
