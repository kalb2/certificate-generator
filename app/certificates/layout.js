import { requirePageAuth } from '@/lib/auth';

export default async function CertificatesLayout({ children }) {
  await requirePageAuth();
  return children;
}
