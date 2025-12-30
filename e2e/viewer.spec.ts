import { test, expect } from '@playwright/test';

// Mock Three.js HTML scene for E2E testing
const mockHtmlScene = `
<!DOCTYPE html>
<html>
<head>
  <title>Test 3D Scene</title>
  <style>
    body { margin: 0; background: #1a1a2e; }
    #scene { 
      width: 100vw; 
      height: 100vh; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      color: white;
      font-family: sans-serif;
    }
  </style>
</head>
<body>
  <div id="scene">🧱 3D Lego Model</div>
  <script>
    // Simulate 3D scene with rotation
    let rotation = 0;
    const elem = document.getElementById('scene');
    
    function animate() {
      rotation += 1;
      elem.style.transform = 'rotate(' + rotation + 'deg)';
      requestAnimationFrame(animate);
    }
    
    // Signal that scene is ready
    window.addEventListener('load', () => {
      console.log('Scene loaded');
      animate();
    });
  </script>
</body>
</html>
`;

test.describe('3D Model Viewer', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to a page that could display the viewer
        // For now, we'll test the component in isolation using the main page
        await page.goto('/');
    });

    test('homepage loads successfully', async ({ page }) => {
        // Basic smoke test - verify the page loads
        await expect(page).toHaveTitle(/Lego Builder/);
    });

    test('page is accessible and can display content', async ({ page }) => {
        // Verify the page can render content
        const main = page.locator('main');
        await expect(main).toBeVisible();
    });
});

test.describe('Viewer Component Rendering (Unit-like E2E)', () => {
    test('viewer iframe can render HTML content', async ({ page }) => {
        // Test that an iframe can render srcDoc content
        await page.setContent(`
      <html>
        <body>
          <iframe 
            id="test-viewer"
            title="3D Model Viewer"
            srcdoc="${mockHtmlScene.replace(/"/g, '&quot;').replace(/\n/g, '')}"
            style="width: 640px; height: 480px; border: 0;"
          ></iframe>
        </body>
      </html>
    `);

        const iframe = page.frameLocator('#test-viewer');
        const scene = iframe.locator('#scene');

        // Wait for the iframe content to load
        await expect(scene).toBeVisible({ timeout: 5000 });
        await expect(scene).toContainText('3D Lego Model');
    });

    test('viewer maintains responsive aspect ratio', async ({ page }) => {
        await page.setContent(`
      <html>
        <body style="margin: 0;">
          <div 
            id="viewer-container" 
            style="width: 100%; aspect-ratio: 16/9; position: relative; background: #f0f0f0;"
          >
            <iframe 
              srcdoc="<html><body style='background:#333;'></body></html>"
              style="width: 100%; height: 100%; border: 0;"
            ></iframe>
          </div>
        </body>
      </html>
    `);

        const container = page.locator('#viewer-container');
        const box = await container.boundingBox();

        // Check aspect ratio is approximately 16:9
        if (box) {
            const expectedHeight = box.width * (9 / 16);
            expect(Math.abs(box.height - expectedHeight)).toBeLessThan(5); // Allow 5px tolerance
        }
    });
});

test.describe('Performance Baseline', () => {
    test('page loads within acceptable time', async ({ page }) => {
        const startTime = Date.now();
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        const loadTime = Date.now() - startTime;

        // Should load within 3 seconds
        expect(loadTime).toBeLessThan(3000);
    });
});
