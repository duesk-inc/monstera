"use client";
import React, { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function Redirector() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams?.toString();
    const path = qs && qs.length > 0
      ? `/admin/weekly-reports?${qs}`
      : '/admin/weekly-reports';
    router.replace(path);
  }, [router, searchParams]);

  return null;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Redirector />
    </Suspense>
  );
}
