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
                <nav className="fixed w-full top-0 left-0 flex justify-between items-center py-2 px-4 z-20 bg-black/20 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                        <h1 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-purple-800 dark:from-purple-400 dark:to-purple-600 bg-clip-text text-transparent">
                            Voice AI Assistant
                        </h1>
                    </div>

                    <div className="flex gap-2 justify-end">
                        <ThemeToggle />
                    </div>
                </nav>
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
