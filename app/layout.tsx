import type {Metadata} from "next";
import "./globals.css";
import {BackgroundWave} from "@/components/background-wave";
import {ThemeProvider} from "@/components/theme-provider";
import {ThemeToggle} from "@/components/theme-toggle";
import { headers } from 'next/headers';

export const metadata: Metadata = {
    title: "Voice AI Assistant",
};

export default async function RootLayout({children}: Readonly<{ children: React.ReactNode }>) {
    const headersList = await headers();
    const pathname = headersList.get('x-pathname') || '';
    const isSidebar = pathname.includes('/sidebar');

    return (
        <html lang="en" className={"h-full w-full"}>
        <body className={`antialiased w-full h-full lex flex-col`}>
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            {!isSidebar && (
            <div className="flex flex-col flex-grow w-full items-center justify-center sm:px-4 bg-transparent">
                <nav className="sm:fixed w-full top-0 left-0 flex justify-between items-center py-4 px-8 z-20 bg-black/20 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 dark:from-purple-400 dark:to-purple-600 bg-clip-text text-transparent">
                            Voice AI Assistant
                        </h1>
                    </div>

                    <div className="flex gap-4 justify-end">
                        <ThemeToggle />
                    </div>
                </nav>
                <div className="relative z-10 bg-transparent">
                    {children}
                </div>
                <BackgroundWave/>
            </div>
            )}
            {isSidebar && children}
        </ThemeProvider>
        </body>
        </html>
    );
}
