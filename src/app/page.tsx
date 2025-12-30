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
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-primary">
            Lego Builder <span className="text-muted-foreground text-2xl font-light">MVP</span>
          </h1>
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
          <p>© 2025 Lego Builder Project • Story 1.3 Verified</p>
        </footer>
      </div>
    </main>
  );
}
