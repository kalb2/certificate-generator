import { requirePageAuth } from '@/lib/auth';

export default async function SetupLayout({ children }) {
  await requirePageAuth();
  return children;
}
