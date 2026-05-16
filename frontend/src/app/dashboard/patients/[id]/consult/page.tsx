'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function LegacyConsultationRedirect() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/dashboard/patients/${params.id}/consultation/capture`);
  }, [params.id, router]);

  return <div className="p-8">Redirecting to consultation capture...</div>;
}
