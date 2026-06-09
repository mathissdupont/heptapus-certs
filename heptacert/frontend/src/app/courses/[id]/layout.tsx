import type { ReactNode } from "react";

export default function CourseIdDisabledLayout({ children: _children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center gap-3 p-8">
      <p className="text-lg font-medium text-gray-700">Bu özellik geçici olarak devre dışı bırakıldı.</p>
      <p className="text-sm text-gray-500">Yakında tekrar kullanıma açılacak.</p>
    </div>
  );
}
