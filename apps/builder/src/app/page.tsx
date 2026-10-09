import { BuilderAuthGate } from "./builder/auth-gate";
import BuilderPage from "./builder/page";

export default function BuilderHome() {
  return (
    <BuilderAuthGate>
      <BuilderPage />
    </BuilderAuthGate>
  );
}
