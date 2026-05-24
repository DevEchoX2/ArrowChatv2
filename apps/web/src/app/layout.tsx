import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ChatProvider } from "@/context/ChatContext";
import { CallProvider } from "@/context/CallContext";
import { Sidebar } from "@/components/Sidebar";
import { CallOverlay } from "@/components/CallOverlay";

export const metadata: Metadata = {
  title: "ArrowChat",
  description: "Bio-link & social platform",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex h-screen overflow-hidden bg-black text-white font-sans">
        <AuthProvider>
          <ChatProvider>
            <CallProvider>
              <Sidebar />
              <main className="flex flex-1 flex-col overflow-hidden">
                {children}
              </main>
              <CallOverlay />
            </CallProvider>
          </ChatProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
