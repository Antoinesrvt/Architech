import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          Generated with&nbsp;
          <code className="font-mono font-bold">ArchiTech</code>
        </p>
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:h-auto lg:w-auto lg:bg-none">
          <div className="pointer-events-none flex place-items-center gap-2 p-8 lg:pointer-events-auto lg:p-0">
            Built with Next.js 13
          </div>
        </div>
      </div>

      <div className="mt-32 flex flex-col items-center justify-center">
        <h1 className="text-6xl font-bold text-center mb-8">
          Welcome to Your <span className="text-primary">Next.js</span> App
        </h1>
        
        <p className="text-xl text-center max-w-2xl mb-8">
          This template includes the latest Next.js 13 features with the App Router, 
          Server Components, and more.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <Button asChild>
            <Link href="/dashboard">
              Go to Dashboard
            </Link>
          </Button>
          
          <Button variant="outline" asChild>
            <Link href="https://nextjs.org/docs" target="_blank" rel="noopener noreferrer">
              View Documentation
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
} 