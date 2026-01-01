'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CameraPermissionFlow } from '@/components/scanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, CheckCircle2 } from 'lucide-react';

type ScanState = 'permission' | 'camera-ready' | 'scanning';

/**
 * Client component for the scan page.
 * Handles camera permission flow and scanning state.
 */
export function ScanContent() {
  const router = useRouter();
  const [scanState, setScanState] = useState<ScanState>('permission');

  const handlePermissionGranted = useCallback(() => {
    setScanState('camera-ready');
  }, []);

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  // Permission flow
  if (scanState === 'permission') {
    return (
      <div className="container mx-auto px-4 py-8">
        <CameraPermissionFlow
          onPermissionGranted={handlePermissionGranted}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  // Camera ready - placeholder for Story 3.3
  if (scanState === 'camera-ready') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2
                  className="h-10 w-10 text-green-600"
                  aria-hidden="true"
                />
              </div>
              <CardTitle className="text-2xl">Camera Ready!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-muted-foreground">
                Camera access granted. The scanning interface will be implemented
                in Story 3.3.
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => setScanState('scanning')}
                  className="w-full"
                  data-testid="start-scanning-button"
                >
                  <Camera className="mr-2 h-5 w-5" aria-hidden="true" />
                  Start Scanning (Coming Soon)
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleCancel}
                  className="w-full"
                >
                  Go Back
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Scanning state - placeholder for Story 3.3
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle>Scanning Interface</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              The camera scanning interface will be implemented in Story 3.3.
            </p>
            <Button
              variant="outline"
              onClick={() => setScanState('camera-ready')}
            >
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
