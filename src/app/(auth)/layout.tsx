import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="h-12 w-12 overflow-hidden rounded-2xl">
            <Image src="/icon-192.png" alt="" width={48} height={48} className="h-full w-full object-cover" priority />
          </div>
          <h1 className="text-xl font-semibold">Riburaju Family Budget</h1>
          <p className="text-sm text-muted-foreground">Private financial dashboard for your family</p>
        </div>
        {children}
      </div>
    </div>
  );
}
