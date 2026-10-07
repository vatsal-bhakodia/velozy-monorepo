import { Navigate } from "react-router-dom";

export default function ReturnsRedirect() {
  return <Navigate to="/commerce/carts?view=returns" replace />;
}
