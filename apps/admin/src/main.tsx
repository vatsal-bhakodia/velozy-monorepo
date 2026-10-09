import {
  lazy,
  Suspense,
  type ComponentType,
  type LazyExoticComponent,
} from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import AdminLayout from "@/src/admin-layout";
import { AuthProvider, useSession } from "@/src/lib/auth";
import { ThemeProvider } from "@/src/lib/theme";
import SignIn from "@/src/signin";
import { queryClient } from "@/src/lib/query-client";
import SignUp from "@/src/signup";
import AuthCallback from "@/src/auth-callback";
import "@/src/globals.css";

const routeModules = import.meta.glob("./routes/**/*.tsx");
const Onboard = lazy(() => import("./onboard/page"));
const page = (module: string) =>
  lazy(
    routeModules[`./routes/${module}.tsx`] as () => Promise<{
      default: ComponentType;
    }>,
  );
const Dashboard = page("dashboard");
const Account = page("account");
const Ai = page("ai");
const Analytics = page("analytics");
const Blogs = page("blogs/index");
const Blog = page("blogs/slug");
const BlogCategories = page("blog-categories");
const Pages = page("pages");
const Media = page("media");
const Navigation = page("navigation");
const Products = page("products/index");
const Product = page("products/slug");
const ProductAttributes = page("product/attributes");
const Collections = page("collections/index");
const ContentCollections = page("content-collections");
const ContentCollectionSchema = page("content-collections/schema");
const ContentCollectionRecord = page("content-collections/record");
const Collection = page("collections/slug");
const CommerceCarts = page("commerce/carts");
const CommerceCart = page("commerce/carts-id");
const CommerceCustomers = page("commerce/customers");
const CommerceDiscounts = page("commerce/discounts");
const CommerceDiscount = page("commerce/discounts-id");
const CommerceDiscountNew = page("commerce/discounts-new");
const CommerceFulfillmentDetail = page("commerce/fulfillment-id");
const CommerceInventory = page("commerce/inventory");
const CommerceLocations = page("commerce/inventory-locations");
const CommerceInvoice = page("commerce/invoices-id");
const CommerceNotifications = page("commerce/notifications");
const CommerceOrders = page("commerce/orders");
const CommerceOrder = page("commerce/orders-id");
const CommercePayment = page("commerce/payments-id");
const CommerceReturns = page("commerce/returns");
const CommerceReturn = page("commerce/returns-id");
const Enquiries = page("enquiries/index");
const EnquiryForms = page("enquiries/forms");
const EnquiryQuotes = page("enquiries/quotes");
const EnquiryFollowUps = page("enquiries/follow-ups");
const Growth = page("growth/index");
const GrowthEvents = page("growth/events");
const GrowthExperiments = page("growth/experiments");
const GrowthRecommendations = page("growth/recommendations");
const GrowthReports = page("growth/reports");
const Seo = page("seo/index");
const SeoCampaign = page("seo/campaign");
const MigrationHome = page("migration/index");
const Settings = page("settings");
const SettingsProject = page("settings/project");
const SettingsAppearance = page("settings/appearance");
const SettingsAccount = page("settings/account");
const SettingsNavigation = page("settings/navigation");
const SettingsCheckout = page("settings/checkout");
const SettingsShippingTax = page("settings/shipping-tax");
const SettingsNotifications = page("settings/notifications");
const SettingsTeam = page("settings/team");
const SettingsPayments = page("settings/payments");
const SettingsDelivery = page("settings/delivery");
const SettingsPlanUsage = page("settings/plan-usage");
const SettingsDomains = page("settings/domains");
const SettingsRecovery = page("settings/recovery");

function ProtectedRoute() {
  const { status } = useSession();
  const location = useLocation();
  if (status === "loading") return null;
  return status === "authenticated" ? (
    <AdminLayout />
  ) : (
    <Navigate to="/signin" replace state={{ from: location.pathname }} />
  );
}
const r = (path: string, Component: LazyExoticComponent<ComponentType>) => (
  <Route path={path} element={<Component />} />
);
function LegacyProductCategoriesRedirect() {
  const { slug } = useParams();
  return (
    <Navigate
      to={slug ? `/collections/${encodeURIComponent(slug)}` : "/collections"}
      replace
    />
  );
}
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <Suspense fallback={null}>
              <Routes>
                <Route path="/signin" element={<SignIn />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/onboard" element={<Onboard />} />
                <Route element={<ProtectedRoute />}>
                  {r("/", Dashboard)}
                  <Route
                    path="/dashboard"
                    element={<Navigate to="/" replace />}
                  />
                  <Route
                    path="/account"
                    element={<Navigate to="/settings/account" replace />}
                  />
                  {r("/ai", Ai)}
                  <Route
                    path="/analytics"
                    element={<Navigate to="/growth?view=analytics" replace />}
                  />
                  {r("/blogs", Blogs)}
                  {r("/blog-categories", BlogCategories)}
                  {r("/blogs/:slug", Blog)}
                  {r("/pages", Pages)}
                  {r("/media", Media)}
                  <Route
                    path="/navigation"
                    element={<Navigate to="/settings/navigation" replace />}
                  />
                  {r("/products", Products)}
                  {r("/products/:slug", Product)}
                  {r("/product-attributes", ProductAttributes)}
                  {r("/collections", Collections)}
                  {r("/collections/:slug", Collection)}
                  {r("/content-collections/new", ContentCollectionSchema)}
                  {r(
                    "/content-collections/:collectionId/edit",
                    ContentCollectionSchema,
                  )}
                  {r(
                    "/content-collections/:collectionId/records/new",
                    ContentCollectionRecord,
                  )}
                  {r(
                    "/content-collections/:collectionId/records/:recordId/edit",
                    ContentCollectionRecord,
                  )}
                  {r("/content-collections", ContentCollections)}
                  <Route
                    path="/product-categories"
                    element={<Navigate to="/collections" replace />}
                  />
                  <Route
                    path="/product-categories/:slug"
                    element={<LegacyProductCategoriesRedirect />}
                  />
                  {r("/commerce/carts", CommerceCarts)}
                  {r("/commerce/carts/:id", CommerceCart)}
                  <Route
                    path="/commerce/checkout"
                    element={<Navigate to="/settings/checkout" replace />}
                  />
                  {r("/commerce/customers", CommerceCustomers)}
                  {r("/commerce/discounts", CommerceDiscounts)}
                  {r("/commerce/discounts/new", CommerceDiscountNew)}
                  {r("/commerce/discounts/:id", CommerceDiscount)}
                  <Route
                    path="/commerce/fulfillment"
                    element={
                      <Navigate to="/commerce/sales?view=fulfillment" replace />
                    }
                  />
                  {r("/commerce/fulfillment/:id", CommerceFulfillmentDetail)}
                  {r("/commerce/inventory", CommerceInventory)}
                  {r("/commerce/inventory/locations", CommerceLocations)}
                  <Route
                    path="/commerce/invoices"
                    element={
                      <Navigate to="/commerce/sales?view=invoices" replace />
                    }
                  />
                  {r("/commerce/invoices/:id", CommerceInvoice)}
                  <Route
                    path="/commerce/notifications"
                    element={<Navigate to="/settings/notifications" replace />}
                  />
                  <Route
                    path="/commerce/orders"
                    element={
                      <Navigate to="/commerce/sales?view=orders" replace />
                    }
                  />
                  {r("/commerce/sales", CommerceOrders)}
                  {r("/commerce/orders/:id", CommerceOrder)}
                  <Route
                    path="/commerce/payments"
                    element={
                      <Navigate to="/commerce/sales?view=payments" replace />
                    }
                  />
                  {r("/commerce/payments/:id", CommercePayment)}
                  {r("/commerce/returns", CommerceReturns)}
                  {r("/commerce/returns/:id", CommerceReturn)}
                  <Route
                    path="/commerce/shipping-tax"
                    element={<Navigate to="/settings/shipping-tax" replace />}
                  />
                  {r("/enquiries", Enquiries)}
                  {r("/enquiries/forms", EnquiryForms)}
                  {r("/enquiries/quotes", EnquiryQuotes)}
                  {r("/enquiries/follow-ups", EnquiryFollowUps)}
                  {r("/growth", Growth)}
                  {r("/growth/events", GrowthEvents)}
                  {r("/growth/experiments", GrowthExperiments)}
                  {r("/growth/recommendations", GrowthRecommendations)}
                  {r("/growth/reports", GrowthReports)}
                  <Route
                    path="/marketing"
                    element={<Navigate to="/seo/campaign" replace />}
                  />
                  <Route
                    path="/marketing/content-planner"
                    element={<Navigate to="/seo/campaign" replace />}
                  />
                  {r("/seo/campaign", SeoCampaign)}
                  {r("/migration", MigrationHome)}
                  <Route
                    path="/migration/import"
                    element={<Navigate to="/migration" replace />}
                  />
                  <Route
                    path="/migration/runs/:id"
                    element={<Navigate to="/migration" replace />}
                  />
                  <Route
                    path="/migration/runs"
                    element={<Navigate to="/migration" replace />}
                  />
                  <Route
                    path="/migration/records"
                    element={<Navigate to="/migration" replace />}
                  />
                  <Route
                    path="/migration/shopify"
                    element={
                      <Navigate to="/migration?platform=shopify" replace />
                    }
                  />
                  <Route
                    path="/migration/woocommerce"
                    element={
                      <Navigate to="/migration?platform=woocommerce" replace />
                    }
                  />
                  <Route
                    path="/migration/preview"
                    element={<Navigate to="/migration" replace />}
                  />
                  <Route
                    path="/migration/compatibility"
                    element={<Navigate to="/migration" replace />}
                  />
                  <Route
                    path="/migration/cutover"
                    element={<Navigate to="/migration" replace />}
                  />
                  <Route
                    path="/imported-records"
                    element={<Navigate to="/migration" replace />}
                  />
                  {r("/seo", Seo)}
                  <Route
                    path="/seo/overview"
                    element={<Navigate to="/seo#seo-overview" replace />}
                  />
                  <Route
                    path="/seo/audit"
                    element={<Navigate to="/seo#seo-audit" replace />}
                  />
                  <Route
                    path="/seo/records"
                    element={<Navigate to="/seo" replace />}
                  />
                  <Route
                    path="/seo/*"
                    element={<Navigate to="/seo?tab=overview" replace />}
                  />
                  {r("/settings", Settings)}
                  {r("/settings/project", SettingsProject)}
                  <Route
                    path="/settings/business"
                    element={<Navigate to="/settings/project" replace />}
                  />
                  {r("/settings/appearance", SettingsAppearance)}
                  {r("/settings/account", SettingsAccount)}
                  {r("/settings/navigation", SettingsNavigation)}
                  {r("/settings/checkout", SettingsCheckout)}
                  {r("/settings/shipping-tax", SettingsShippingTax)}
                  {r("/settings/notifications", SettingsNotifications)}
                  {r("/settings/team", SettingsTeam)}
                  {r("/settings/payments", SettingsPayments)}
                  {r("/settings/delivery", SettingsDelivery)}
                  {r("/settings/plan-usage", SettingsPlanUsage)}
                  {r("/settings/domains", SettingsDomains)}
                  {r("/settings/recovery", SettingsRecovery)}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </Suspense>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Admin app root element was not found");

const root = createRoot(rootElement);
root.render(<App />);

if (import.meta.hot) {
  import.meta.hot.dispose(() => root.unmount());
}
