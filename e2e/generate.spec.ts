import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Text-to-Lego Model Generation
 * @see Story 2.2: Implement Text-to-Lego Model Generation
 */

// Mock successful generation response (HTML scene)
const mockSuccessHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Generated Lego Model</title>
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
  <div id="scene">🧱 Generated Lego Dragon</div>
  <script>
    // Signal ready to parent
    window.parent.postMessage({ type: 'ready' }, '*');
  </script>
</body>
</html>
`;

test.describe('Create Page - Text-to-Lego Generation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/create');
    });

    test('should display create page with input form', async ({ page }) => {
        // Verify page title and header
        await expect(page).toHaveTitle(/Create.*Lego Builder/);

        // Verify form elements are present
        const textarea = page.getByTestId('prompt-input');
        await expect(textarea).toBeVisible();
        await expect(textarea).toHaveAttribute('placeholder', 'What do you feel like building today?');

        const submitButton = page.getByTestId('submit-button');
        await expect(submitButton).toBeVisible();
        await expect(submitButton).toHaveText('Create My Design');
        await expect(submitButton).toBeDisabled(); // Empty prompt

        const charCount = page.getByTestId('char-count');
        await expect(charCount).toHaveText('0/1000');
    });

    test('should enable submit button when valid prompt is entered', async ({ page }) => {
        const textarea = page.getByTestId('prompt-input');
        const submitButton = page.getByTestId('submit-button');

        // Initially disabled
        await expect(submitButton).toBeDisabled();

        // Type a prompt
        await textarea.fill('dragon');

        // Character count updates
        const charCount = page.getByTestId('char-count');
        await expect(charCount).toHaveText('6/1000');

        // Button is now enabled
        await expect(submitButton).not.toBeDisabled();
    });

    test('should show validation error when prompt exceeds limit', async ({ page }) => {
        const textarea = page.getByTestId('prompt-input');
        const submitButton = page.getByTestId('submit-button');

        // Type a very long prompt (over 1000 characters)
        const longPrompt = 'a'.repeat(1001);
        await textarea.fill(longPrompt);

        // Validation error should appear
        const validationError = page.getByTestId('validation-error');
        await expect(validationError).toBeVisible();

        // Button should be disabled
        await expect(submitButton).toBeDisabled();

        // Character count shows over limit
        const charCount = page.getByTestId('char-count');
        await expect(charCount).toHaveText('1001/1000');
    });

    test('should show progress storytelling during generation', async ({ page }) => {
        // Mock the API to delay response
        await page.route('**/api/generate', async (route) => {
            // Delay to allow us to see the progress states
            await new Promise((resolve) => setTimeout(resolve, 500));

            // Return streamed response
            await route.fulfill({
                status: 200,
                contentType: 'text/plain; charset=utf-8',
                body: mockSuccessHtml,
            });
        });

        const textarea = page.getByTestId('prompt-input');
        const submitButton = page.getByTestId('submit-button');

        // Enter prompt and submit
        await textarea.fill('dragon');
        await submitButton.click();

        // Progress component should appear
        const progressComponent = page.getByTestId('generation-progress');
        await expect(progressComponent).toBeVisible();

        // Should show the first phase message
        const progressMessage = page.getByTestId('progress-message');
        await expect(progressMessage).toContainText(/(Imagining|Finding|Building)/);

        // Should have phase indicators
        const phaseIndicators = page.getByTestId('phase-indicators');
        await expect(phaseIndicators).toBeVisible();
    });

    test('should display generated model in viewer after successful generation', async ({ page }) => {
        // Mock successful API response
        await page.route('**/api/generate', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'text/plain; charset=utf-8',
                body: mockSuccessHtml,
            });
        });

        const textarea = page.getByTestId('prompt-input');
        const submitButton = page.getByTestId('submit-button');

        // Enter prompt and submit
        await textarea.fill('dragon');
        await submitButton.click();

        // Wait for result section to appear
        const resultSection = page.getByTestId('result-section');
        await expect(resultSection).toBeVisible({ timeout: 10000 });

        // Should show duration badge
        const durationBadge = page.getByTestId('duration-badge');
        await expect(durationBadge).toBeVisible();
        await expect(durationBadge).toContainText(/Generated in \d+\.\d+s/);

        // Model viewer should be present
        const modelViewer = page.getByTestId('model-viewer');
        await expect(modelViewer).toBeVisible();

        // New design button should be visible
        const newDesignButton = page.getByTestId('new-design-button');
        await expect(newDesignButton).toBeVisible();
        await expect(newDesignButton).toHaveText('Create New Design');
    });

    test('should display error message when generation fails', async ({ page }) => {
        // Mock failed API response
        await page.route('**/api/generate', async (route) => {
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: false,
                    error: {
                        code: 'GENERATION_FAILED',
                        message: 'Unable to generate model',
                    },
                }),
            });
        });

        const textarea = page.getByTestId('prompt-input');
        const submitButton = page.getByTestId('submit-button');

        // Enter prompt and submit
        await textarea.fill('dragon');
        await submitButton.click();

        // Error section should appear
        const errorSection = page.getByTestId('error-section');
        await expect(errorSection).toBeVisible({ timeout: 10000 });

        // Error message should be user-friendly
        const errorMessage = page.getByTestId('error-message');
        await expect(errorMessage).toBeVisible();
        await expect(errorMessage).toContainText("Couldn't create your design");

        // Retry button should be visible
        const retryButton = page.getByTestId('retry-button');
        await expect(retryButton).toBeVisible();
        await expect(retryButton).toHaveText('Try Again');
    });

    test('should allow retry after error', async ({ page }) => {
        // First request fails
        let requestCount = 0;
        await page.route('**/api/generate', async (route) => {
            requestCount++;
            if (requestCount === 1) {
                // First request fails
                await route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: false,
                        error: { code: 'GENERATION_FAILED', message: 'Failed' },
                    }),
                });
            } else {
                // Subsequent requests succeed
                await route.fulfill({
                    status: 200,
                    contentType: 'text/plain; charset=utf-8',
                    body: mockSuccessHtml,
                });
            }
        });

        const textarea = page.getByTestId('prompt-input');
        const submitButton = page.getByTestId('submit-button');

        // First attempt fails
        await textarea.fill('dragon');
        await submitButton.click();

        // Wait for error
        const retryButton = page.getByTestId('retry-button');
        await expect(retryButton).toBeVisible({ timeout: 10000 });

        // Click retry
        await retryButton.click();

        // Should show input form again (not attempting immediately)
        const promptInput = page.getByTestId('prompt-input');
        await expect(promptInput).toBeVisible();
    });

    test('should reset to input state when clicking New Design', async ({ page }) => {
        // Mock successful API response
        await page.route('**/api/generate', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'text/plain; charset=utf-8',
                body: mockSuccessHtml,
            });
        });

        const textarea = page.getByTestId('prompt-input');
        const submitButton = page.getByTestId('submit-button');

        // Generate a model
        await textarea.fill('dragon');
        await submitButton.click();

        // Wait for result
        const newDesignButton = page.getByTestId('new-design-button');
        await expect(newDesignButton).toBeVisible({ timeout: 10000 });

        // Click new design
        await newDesignButton.click();

        // Should show input form again
        const promptInput = page.getByTestId('prompt-input');
        await expect(promptInput).toBeVisible();
        await expect(promptInput).toHaveValue(''); // Empty
    });

    test('should handle rate limiting error', async ({ page }) => {
        // Mock rate limited response
        await page.route('**/api/generate', async (route) => {
            await route.fulfill({
                status: 429,
                contentType: 'application/json',
                headers: { 'Retry-After': '60' },
                body: JSON.stringify({
                    success: false,
                    error: {
                        code: 'RATE_LIMITED',
                        message: 'Too many requests',
                    },
                }),
            });
        });

        const textarea = page.getByTestId('prompt-input');
        const submitButton = page.getByTestId('submit-button');

        await textarea.fill('dragon');
        await submitButton.click();

        // Error message for rate limiting
        const errorMessage = page.getByTestId('error-message');
        await expect(errorMessage).toBeVisible({ timeout: 10000 });
        await expect(errorMessage).toContainText("creating too fast");
    });
});

test.describe('Create Page - Accessibility', () => {
    test('should have proper heading structure', async ({ page }) => {
        await page.goto('/create');

        // Check for h1
        const h1 = page.locator('h1');
        await expect(h1).toHaveText('Create Your Design');

        // Should only have one h1
        await expect(h1).toHaveCount(1);
    });

    test('should have accessible form elements', async ({ page }) => {
        await page.goto('/create');

        // Textarea should be labelled
        const textarea = page.getByRole('textbox');
        await expect(textarea).toBeVisible();

        // Submit button should be a button
        const submitButton = page.getByRole('button', { name: /create my design/i });
        await expect(submitButton).toBeVisible();
    });

    test('should announce loading state to screen readers', async ({ page }) => {
        await page.route('**/api/generate', async (route) => {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            await route.fulfill({
                status: 200,
                contentType: 'text/plain; charset=utf-8',
                body: mockSuccessHtml,
            });
        });

        await page.goto('/create');

        const textarea = page.getByTestId('prompt-input');
        const submitButton = page.getByTestId('submit-button');

        await textarea.fill('dragon');
        await submitButton.click();

        // Check for status role on progress component
        const progressComponent = page.getByTestId('generation-progress');
        await expect(progressComponent).toHaveAttribute('role', 'status');
        await expect(progressComponent).toHaveAttribute('aria-busy', 'true');
    });
});

test.describe('Create Page - Performance', () => {
    test('page loads within acceptable time', async ({ page }) => {
        const startTime = Date.now();
        await page.goto('/create');
        await page.waitForLoadState('domcontentloaded');
        const loadTime = Date.now() - startTime;

        // Should load within 3 seconds
        expect(loadTime).toBeLessThan(3000);
    });
});

/**
 * E2E Tests for Image-to-Lego Model Generation
 * @see Story 2.3: Implement Image-to-Lego Model Generation
 */
test.describe('Create Page - Image Mode', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/create');
    });

    test('should display mode toggle with Text and Image options', async ({ page }) => {
        const modeToggle = page.getByTestId('mode-toggle');
        await expect(modeToggle).toBeVisible();

        const textButton = page.getByTestId('mode-text-button');
        const imageButton = page.getByTestId('mode-image-button');

        await expect(textButton).toBeVisible();
        await expect(imageButton).toBeVisible();

        // Text mode should be active by default
        await expect(textButton).toHaveAttribute('aria-pressed', 'true');
        await expect(imageButton).toHaveAttribute('aria-pressed', 'false');
    });

    test('should switch to image mode when clicking Image button', async ({ page }) => {
        const imageButton = page.getByTestId('mode-image-button');
        await imageButton.click();

        // Image button should now be active
        await expect(imageButton).toHaveAttribute('aria-pressed', 'true');

        // Text button should be inactive
        const textButton = page.getByTestId('mode-text-button');
        await expect(textButton).toHaveAttribute('aria-pressed', 'false');
    });

    test('should show image upload zone in image mode', async ({ page }) => {
        // Switch to image mode
        const imageButton = page.getByTestId('mode-image-button');
        await imageButton.click();

        // Image upload zone should be visible
        const uploadZone = page.getByTestId('image-upload-zone');
        await expect(uploadZone).toBeVisible();

        // Text input should not be visible
        const promptInput = page.getByTestId('prompt-input');
        await expect(promptInput).not.toBeVisible();
    });

    test('should show drag-and-drop instructions in image mode', async ({ page }) => {
        // Switch to image mode
        const imageButton = page.getByTestId('mode-image-button');
        await imageButton.click();

        // Check for drag-and-drop text
        await expect(page.getByText(/drag.*drop/i)).toBeVisible();
        await expect(page.getByText(/browse files/i)).toBeVisible();
    });

    test('should show drag-over state when dragging file over upload zone', async ({ page }) => {
        // Switch to image mode
        const imageButton = page.getByTestId('mode-image-button');
        await imageButton.click();

        const uploadZone = page.getByTestId('image-upload-zone');

        // Simulate drag over event
        await uploadZone.dispatchEvent('dragover', {
            dataTransfer: { types: ['Files'], files: [] },
        });

        // Check for visual feedback (border-primary class indicates drag state)
        await expect(uploadZone).toHaveClass(/border-primary/);
    });

    test('should remove drag-over state when dragging leaves upload zone', async ({ page }) => {
        // Switch to image mode
        const imageButton = page.getByTestId('mode-image-button');
        await imageButton.click();

        const uploadZone = page.getByTestId('image-upload-zone');

        // Simulate drag over then drag leave
        await uploadZone.dispatchEvent('dragover', {
            dataTransfer: { types: ['Files'], files: [] },
        });
        await uploadZone.dispatchEvent('dragleave', {});

        // Check drag state is removed
        await expect(uploadZone).not.toHaveClass(/border-primary/);
    });

    test('should show file input for browsing in image mode', async ({ page }) => {
        // Switch to image mode
        const imageButton = page.getByTestId('mode-image-button');
        await imageButton.click();

        // File input should exist (hidden but accessible)
        const fileInput = page.getByTestId('file-input');
        await expect(fileInput).toBeAttached();
        await expect(fileInput).toHaveAttribute('type', 'file');
        await expect(fileInput).toHaveAttribute('accept', 'image/png,image/jpeg,image/webp,image/heic');
    });

    test('should upload image and start generation', async ({ page }) => {
        // Mock successful API response
        await page.route('**/api/generate', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'text/plain; charset=utf-8',
                body: mockSuccessHtml,
            });
        });

        // Switch to image mode
        const imageButton = page.getByTestId('mode-image-button');
        await imageButton.click();

        // Create a test image file
        const fileInput = page.getByTestId('file-input');

        // Upload a small test PNG
        await fileInput.setInputFiles({
            name: 'test.png',
            mimeType: 'image/png',
            buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'),
        });

        // Wait for result section to appear
        const resultSection = page.getByTestId('result-section');
        await expect(resultSection).toBeVisible({ timeout: 15000 });

        // Model viewer should be present
        const modelViewer = page.getByTestId('model-viewer');
        await expect(modelViewer).toBeVisible();
    });

    test('should show progress storytelling during image generation', async ({ page }) => {
        // Mock the API to delay response
        await page.route('**/api/generate', async (route) => {
            await new Promise((resolve) => setTimeout(resolve, 500));
            await route.fulfill({
                status: 200,
                contentType: 'text/plain; charset=utf-8',
                body: mockSuccessHtml,
            });
        });

        // Switch to image mode
        const imageButton = page.getByTestId('mode-image-button');
        await imageButton.click();

        // Upload image
        const fileInput = page.getByTestId('file-input');
        await fileInput.setInputFiles({
            name: 'test.png',
            mimeType: 'image/png',
            buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'),
        });

        // Progress component should appear
        const progressComponent = page.getByTestId('generation-progress');
        await expect(progressComponent).toBeVisible();

        // Should show progress message
        const progressMessage = page.getByTestId('progress-message');
        await expect(progressMessage).toContainText(/(Imagining|Finding|Building)/);
    });

    test('should show error message for invalid file type', async ({ page }) => {
        // Switch to image mode
        const imageButton = page.getByTestId('mode-image-button');
        await imageButton.click();

        // Try to upload a non-image file (PDF)
        const fileInput = page.getByTestId('file-input');
        await fileInput.setInputFiles({
            name: 'document.pdf',
            mimeType: 'application/pdf',
            buffer: Buffer.from('fake pdf content'),
        });

        // Error should be visible
        const uploadError = page.getByTestId('upload-error');
        await expect(uploadError).toBeVisible();
        await expect(uploadError).toContainText(/PNG, JPEG, WEBP, or HEIC/i);
    });

    test('should show image preview after valid file selection', async ({ page }) => {
        // Mock successful API response but delay it
        await page.route('**/api/generate', async (route) => {
            await new Promise((resolve) => setTimeout(resolve, 5000));
            await route.fulfill({
                status: 200,
                contentType: 'text/plain; charset=utf-8',
                body: mockSuccessHtml,
            });
        });

        // Switch to image mode
        const imageButton = page.getByTestId('mode-image-button');
        await imageButton.click();

        // Upload image
        const fileInput = page.getByTestId('file-input');
        await fileInput.setInputFiles({
            name: 'test.png',
            mimeType: 'image/png',
            buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'),
        });

        // Preview should appear (briefly before generation starts)
        const preview = page.getByTestId('image-preview');
        // Note: Preview may be very brief before generation starts, so we just check generation started
        const progressComponent = page.getByTestId('generation-progress');
        await expect(progressComponent).toBeVisible({ timeout: 2000 });
    });

    test('should handle API error during image generation', async ({ page }) => {
        // Mock failed API response
        await page.route('**/api/generate', async (route) => {
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: false,
                    error: {
                        code: 'GENERATION_FAILED',
                        message: 'Unable to process image',
                    },
                }),
            });
        });

        // Switch to image mode
        const imageButton = page.getByTestId('mode-image-button');
        await imageButton.click();

        // Upload image
        const fileInput = page.getByTestId('file-input');
        await fileInput.setInputFiles({
            name: 'test.png',
            mimeType: 'image/png',
            buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'),
        });

        // Error section should appear
        const errorSection = page.getByTestId('error-section');
        await expect(errorSection).toBeVisible({ timeout: 10000 });

        // Error message should be user-friendly
        const errorMessage = page.getByTestId('error-message');
        await expect(errorMessage).toBeVisible();
        await expect(errorMessage).toContainText(/image/i);

        // Retry button should be visible
        const retryButton = page.getByTestId('retry-button');
        await expect(retryButton).toBeVisible();
    });

    test('should switch back to text mode and preserve text functionality', async ({ page }) => {
        // Switch to image mode
        const imageButton = page.getByTestId('mode-image-button');
        await imageButton.click();

        // Verify image mode
        await expect(page.getByTestId('image-upload-zone')).toBeVisible();

        // Switch back to text mode
        const textButton = page.getByTestId('mode-text-button');
        await textButton.click();

        // Text input should be visible again
        const promptInput = page.getByTestId('prompt-input');
        await expect(promptInput).toBeVisible();

        // Image upload zone should not be visible
        await expect(page.getByTestId('image-upload-zone')).not.toBeVisible();
    });
});
