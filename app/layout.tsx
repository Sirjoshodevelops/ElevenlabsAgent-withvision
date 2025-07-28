import type {Metadata} from "next";
import "./globals.css";
import {BackgroundWave} from "@/components/background-wave";
import {ThemeProvider} from "@/components/theme-provider";
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
        <body className={`antialiased w-full h-full flex flex-col`}>
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            {!isSidebar && (
                <div className="flex flex-col flex-grow w-full items-center justify-center sm:px-4 bg-transparent">
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
