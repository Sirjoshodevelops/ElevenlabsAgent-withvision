import type {Metadata} from "next";
import "../globals.css";
import {ThemeProvider} from "@/components/theme-provider";

export const metadata: Metadata = {
    title: "Voice AI Assistant - Sidebar",
};

export default function SidebarLayout({children}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en" className="h-full w-full">
        <body className="antialiased w-full h-full flex flex-col overflow-hidden">
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <div className="sidebar-viewport">
                {children}
            </div>
        </ThemeProvider>
        </body>
        </html>
    );
}