'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function StorageSetupPage() {
  const [secretKey, setSecretKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSetup = async () => {
    if (!secretKey) {
      setError('Please enter the API secret key');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/storage/setup?key=${encodeURIComponent(secretKey)}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to set up storage buckets');
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(`Unexpected error: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-3xl py-10">
      <Card>
        <CardHeader>
          <CardTitle>Storage Setup</CardTitle>
          <CardDescription>
            Set up the storage buckets and policies required for the Church CMS application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="secretKey" className="text-sm font-medium">
              API Secret Key
            </label>
            <Input
              id="secretKey"
              type="password"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="Enter the API secret key"
            />
            <p className="text-sm text-muted-foreground">
              This is the NEXT_PUBLIC_API_SECRET_KEY from your .env.local file
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Alert variant="default" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>
                <div className="mt-2">
                  <p>{result.message}</p>
                  <div className="mt-4 space-y-2">
                    {result.results.map((item: any, index: number) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        {item.success ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="font-medium">{item.bucket}:</span>
                        <span>{item.message || item.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleSetup} disabled={isLoading} className="ml-auto">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up...
              </>
            ) : (
              'Set Up Storage'
            )}
          </Button>
        </CardFooter>
      </Card>

      <div className="mt-8 space-y-4">
        <h2 className="text-xl font-semibold">Manual Setup Instructions</h2>
        <p>
          If the automatic setup doesn't work, you can set up the storage buckets manually in the Supabase dashboard:
        </p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Go to your Supabase dashboard</li>
          <li>Navigate to Storage → Buckets</li>
          <li>
            Create the following buckets:
            <ul className="list-disc pl-5 mt-1">
              <li><code>members</code> (public access)</li>
              <li><code>events</code> (public access)</li>
              <li><code>documents</code> (private access)</li>
            </ul>
          </li>
          <li>
            For each bucket, set up the following policies:
            <ul className="list-disc pl-5 mt-1">
              <li><code>authenticated_uploads</code>: Allow authenticated users to upload files</li>
              <li><code>authenticated_updates</code>: Allow authenticated users to update their files</li>
              <li>For public buckets, add <code>public_read</code> policy to allow anyone to read files</li>
              <li>For private buckets, add <code>authenticated_read</code> policy to allow only authenticated users to read files</li>
            </ul>
          </li>
        </ol>
      </div>
    </div>
  );
}
