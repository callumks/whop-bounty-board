'use client';

import { useEffect, useState } from 'react';

// Build-safe Whop provider that only loads in browser
function WhopSafeProvider({ children }: { children: React.ReactNode }) {
  const [WhopProvider, setWhopProvider] = useState<React.ComponentType<{ children: React.ReactNode }> | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Only run this in the browser, not during build
    setIsClient(true);
    
    const loadWhopProvider = async () => {
      try {
        // Only load Whop SDK in browser environment with proper app ID
        if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_WHOP_APP_ID) {
          const whopReact = await import('@whop/react');
          setWhopProvider(() => whopReact.WhopIframeSdkProvider);
        }
      } catch (error) {
        console.warn('Failed to load Whop SDK:', error);
        // Fallback - just render children without provider
        setWhopProvider(() => ({ children }: { children: React.ReactNode }) => <>{children}</>);
      }
    };

    loadWhopProvider();
  }, []);

  // During SSR or before client hydration, render without provider
  if (!isClient || !WhopProvider) {
    return <>{children}</>;
  }

  // In browser with loaded provider
  return <WhopProvider>{children}</WhopProvider>;
}

export default function ClientLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <WhopSafeProvider>
      {children}
    </WhopSafeProvider>
  );
} 