import type { Metadata } from 'next';
import Link from 'next/link';
import { CreateContent } from './CreateContent';

export const metadata: Metadata = {
    title: 'Create - Lego Builder',
    description: 'Turn your ideas into buildable Lego models. Describe what you want to build and watch AI create a 3D model for you.',
    openGraph: {
        title: 'Create - Lego Builder',
        description: 'Turn your ideas into buildable Lego models with AI.',
    },
};

/**
 * Create Page
 * 
 * Allows users to enter a text prompt and generate a 3D Lego model.
 * Features progress storytelling during generation.
 * 
 * @see Story 2.2: Implement Text-to-Lego Model Generation
 */
export default function CreatePage() {
    return (
        <main className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Back Navigation */}
                <nav className="mb-6">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        data-testid="back-link"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="w-4 h-4"
                            aria-hidden="true"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                        </svg>
                        Back to Home
                    </Link>
                </nav>

                <header className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-foreground mb-2">
                        Create Your Design
                    </h1>
                    <p className="text-muted-foreground">
                        Describe what you want to build and let AI bring it to life
                    </p>
                </header>

                <CreateContent />
            </div>
        </main>
    );
}

