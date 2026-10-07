export default function BuilderHome() {
  return <main className="grid min-h-screen place-items-center bg-neutral-950 p-6 text-white"><div className="max-w-md text-center"><h1 className="text-2xl font-semibold">Velozy builder</h1><p className="mt-3 text-white/60">Open a page from the admin workspace to start editing.</p><a className="mt-6 inline-block rounded-md bg-white px-4 py-2 text-black" href={`${process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:5173"}/pages`}>Open pages</a></div></main>;
}
