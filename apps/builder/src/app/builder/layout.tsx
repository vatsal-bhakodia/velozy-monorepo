import { BuilderAuthGate } from "./auth-gate";

export default function BuilderLayout({ children }: { children: React.ReactNode }) {
  return <BuilderAuthGate>{children}</BuilderAuthGate>;
}
