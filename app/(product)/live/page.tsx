import { redirect } from 'next/navigation';

export default function LiveAliasPage() {
  redirect('/control?tab=live');
}
