import Link from 'next/link';
import { ModelViewer } from '@/components/viewer/ModelViewer';

/**
 * Main Home Page
 * Showcases the current progress of the Lego Builder application
 */
export default function Home() {
  // A very basic sample Three.js scene for demonstration purposes
  const sampleHtmlScene = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Lego Builder Scene</title>
        <style>
          body { margin: 0; background: #f0f0f0; overflow: hidden; font-family: sans-serif; }
          #canvas-container { width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; }
          .brick { 
            width: 100px; height: 50px; background: #e63946; 
            border: 2px solid #a22933; border-radius: 4px; 
            position: relative; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            transition: transform 0.15s ease-out;
          }
          .brick::before, .brick::after { content: ''; position: absolute; width: 20px; height: 10px; background: #e63946; border: 2px solid #a22933; border-radius: 50% 50% 0 0; top: -10px; }
          .brick::before { left: 20px; }
          .brick::after { left: 60px; }
          .label { position: absolute; bottom: 20px; width: 100%; text-align: center; color: #333; font-weight: bold; }
        </style>
      </head>
      <body>
        <div id="canvas-container">
          <div class="brick"></div>
          <div class="label">3D Scene Mockup</div>
        </div>
        <script>
          // State for the brick
          let rotation = 0;
          let scale = 1;
          const brick = document.querySelector('.brick');
          
          function updateTransform() {
            brick.style.transform = 'rotate(' + rotation + 'deg) scale(' + scale + ')';
          }

          // Standard protocol for ModelViewer communication
          window.addEventListener('message', (event) => {
            console.log('Scene received message:', event.data);
            
            if (event.data.type === 'rotate') {
              rotation += event.data.direction === 'right' ? 15 : -15;
              updateTransform();
            }
            if (event.data.type === 'zoom') {
              scale *= event.data.direction === 'in' ? 1.2 : 0.8;
              scale = Math.max(0.2, Math.min(5, scale)); // Clamp between 0.2 and 5
              updateTransform();
            }
            if (event.data.type === 'reset') {
              rotation = 0;
              scale = 1;
              updateTransform();
            }
          });

          // Signal that the scene is ready
          setTimeout(() => {
            window.parent.postMessage({ type: 'ready' }, '*');
          }, 500);
        </script>
      </body>
    </html>
    `;

  return (
    <main className="min-h-screen bg-background p-4 md:p-8 pb-24">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="space-y-2">
          <nav className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold tracking-tight text-primary">
              Lego Builder <span className="text-muted-foreground text-2xl font-light">MVP</span>
            </h1>
            <div className="flex items-center gap-2">
              <Link
                href="/scan"
                className="px-4 py-2 rounded-lg font-semibold text-sm border border-primary text-primary hover:bg-primary/10 transition-colors"
                data-testid="nav-scan"
              >
                Scan Bricks
              </Link>
              <Link
                href="/create"
                className="px-4 py-2 rounded-lg font-semibold text-sm bg-[#FFB800] hover:bg-[#E6A600] text-black transition-colors"
                data-testid="nav-create"
              >
                Create
              </Link>
            </div>
          </nav>
          <p className="text-muted-foreground italic">
            Visualizing your creative brick constructions in 3D.
          </p>
        </header>

        <section className="bg-card rounded-xl border shadow-sm p-1 overflow-hidden">
          <ModelViewer
            htmlScene={sampleHtmlScene}
            className="w-full"
          />
        </section>

        <footer className="text-sm text-muted-foreground border-t pt-4">
          <p>© 2025 Lego Builder Project • Story 2.2 Verified</p>
        </footer>
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3">
        {/* Scan FAB */}
        <Link
          href="/scan"
          className="w-14 h-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg flex items-center justify-center transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          aria-label="Scan bricks"
          data-testid="fab-scan"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-6 h-6"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
          </svg>
        </Link>
        {/* Create FAB */}
        <Link
          href="/create"
          className="w-14 h-14 rounded-full bg-[#FFB800] hover:bg-[#E6A600] text-black shadow-lg flex items-center justify-center transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FFB800]"
          aria-label="Create new design"
          data-testid="fab-create"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="w-6 h-6"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </Link>
      </div>
    </main>
  );
}

