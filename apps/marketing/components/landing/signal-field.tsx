export default function SignalField() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(103,232,249,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,0.055)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="absolute left-1/2 top-[-20%] h-[90%] w-px bg-gradient-to-b from-transparent via-cyan-300/50 to-transparent" />
      <div className="absolute left-[18%] top-0 h-full w-px bg-gradient-to-b from-transparent via-cyan-300/20 to-transparent" />
      <div className="absolute right-[18%] top-0 h-full w-px bg-gradient-to-b from-transparent via-blue-300/20 to-transparent" />
      <div className="absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/10" />
      <div className="absolute left-1/2 top-1/2 h-[370px] w-[370px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/10" />
    </div>
  );
}
