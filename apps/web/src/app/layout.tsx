import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ChatProvider } from "@/context/ChatContext";
import { Sidebar } from "@/components/Sidebar";

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
            <Sidebar />
            <main className="flex flex-1 flex-col overflow-hidden">
              {children}
            </main>
          </ChatProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
