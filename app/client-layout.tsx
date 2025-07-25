'use client';

import { WhopIframeSdkProvider } from "@whop/react";

export default function ClientLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <WhopIframeSdkProvider>
      {children}
    </WhopIframeSdkProvider>
  );
} 