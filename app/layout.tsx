import type {Metadata} from "next";
import "./globals.css";
import {BackgroundWave} from "@/components/background-wave";
import {ThemeProvider} from "@/components/theme-provider";
import {ThemeToggle} from "@/components/theme-toggle";

export const metadata: Metadata = {
    title: "Voice AI Assistant",
};

export default function RootLayout({children}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en" className="h-full w-full">
        <body className="antialiased w-full h-full flex flex-col">
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <div className="flex flex-col flex-grow w-full items-center justify-center px-2 bg-transparent min-h-screen">
                <div className="relative z-10 bg-transparent w-full h-screen flex items-center justify-center">
                    {children}
                </div>
                <BackgroundWave />
            </div>
        </ThemeProvider>
        </body>
        </html>
    );
}
