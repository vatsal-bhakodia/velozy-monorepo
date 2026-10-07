"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { trackGrowthEvent } from "@/components/growth-tracker";

type Product = {
  id: string;
  name: string;
  description: string;
  price: number | null;
  currency: string;
  productKind: string;
  image: string;
};
type CartItem = { productId: string; quantity: number };
type Address = {
  name: string;
  email: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};
type Customer = Pick<Address, "name" | "email" | "phone" | "country">;
type ShippingRate = {
  provider: string;
  rateId: string;
  label: string;
  amount: number;
  currency: string;
  quoteToken: string;
  estimatedDays?: number;
};

const emptyAddress: Address = {
  name: "",
  email: "",
  phone: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "US",
};
const apiBase = (
  process.env.NEXT_PUBLIC_VELOZY_API_URL || "http://localhost:4000"
).replace(/\/$/, "");
const cartKey = (projectId: string) => `velozy-cart-${projectId}`;

function readCart(projectId: string): CartItem[] {
  try {
    const value = JSON.parse(localStorage.getItem(cartKey(projectId)) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function AddToCart({
  projectId,
  product,
  currency,
  purchaseMode,
  experimentButtonText,
}: {
  projectId: string;
  product: Product;
  currency: string;
  purchaseMode: string;
  experimentButtonText?: string;
}) {
  const [added, setAdded] = useState(false);
  const add = () => {
    const cart = readCart(projectId);
    const item = cart.find((entry) => entry.productId === product.id);
    const next = item
      ? cart.map((entry) =>
          entry.productId === product.id
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry,
        )
      : [...cart, { productId: product.id, quantity: 1 }];
    localStorage.setItem(cartKey(projectId), JSON.stringify(next));
    setAdded(true);
    trackGrowthEvent("add_to_cart", { product_id: product.id });
  };
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-xl">
        {product.price == null
          ? "Contact for price"
          : money(product.price, currency)}
      </span>
      {product.price != null && purchaseMode === "checkout" && (
        <button
          type="button"
          data-growth-variant-button
          onClick={add}
          className="rounded-md bg-[var(--color-primary,#111827)] px-5 py-3 text-sm text-white"
        >
          {added ? "Added to cart" : experimentButtonText || "Add to cart"}
        </button>
      )}
      <a
        href={purchaseMode === "checkout" ? "/cart" : "/contact"}
        className="rounded-md border border-[var(--color-border,#d4d4d8)] px-5 py-3 text-sm"
      >
        {purchaseMode === "checkout" ? "View cart" : "Ask about this product"}
      </a>
    </div>
  );
}

export function CheckoutExperience({
  projectId,
  kind,
  experimentButtonText,
  experimentHeadline,
}: {
  projectId: string;
  kind: "cart" | "checkout";
  experimentButtonText?: string;
  experimentHeadline?: string;
}) {
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currency, setCurrency] = useState("USD");
  const [purchaseMode, setPurchaseMode] = useState("");
  const [customer, setCustomer] = useState<Customer>({
    name: "",
    email: "",
    phone: "",
    country: "US",
  });
  const [shippingAddress, setShippingAddress] = useState<Address>(emptyAddress);
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [selectedRate, setSelectedRate] = useState("");
  const [loadingRates, setLoadingRates] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [orderStatus, setOrderStatus] = useState<{
    status: string;
    total: string;
  } | null>(null);
  const [orderId, setOrderId] = useState("");
  const [checkoutKey, setCheckoutKey] = useState("");
  const reportedPurchase = useRef("");

  useEffect(() => {
    setCart(readCart(projectId));
    setCheckoutKey(crypto.randomUUID());
    fetch(`${apiBase}/api/public/projects/${projectId}/catalog`, {
      cache: "no-store",
    })
      .then((response) => response.json())
      .then((data) => {
        setCatalog(data.products ?? []);
        setCurrency(data.currency ?? "USD");
        setPurchaseMode(data.purchaseMode ?? "");
      })
      .catch(() => setError("Could not load this store's products."));
  }, [projectId]);

  const cartProducts = useMemo(
    () =>
      cart.flatMap((line) => {
        const product = catalog.find((item) => item.id === line.productId);
        return product ? [{ ...product, quantity: line.quantity }] : [];
      }),
    [cart, catalog],
  );
  const physical = cartProducts.some(
    (product) => product.productKind === "physical",
  );
  const subtotal = cartProducts.reduce(
    (sum, product) => sum + Number(product.price || 0) * product.quantity,
    0,
  );
  const activeRate = rates.find((rate) => rate.quoteToken === selectedRate);
  const total = subtotal + (activeRate?.amount || 0);

  useEffect(() => {
    if (!orderId) return;
    let attempts = 0;
    const check = () => {
      fetch(`${apiBase}/api/public/projects/${projectId}/orders/${orderId}`, {
        cache: "no-store",
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.order) {
            setOrderStatus({
              status: data.order.status,
              total: data.order.total,
            });
            if (
              ["paid", "fulfilled", "completed"].includes(data.order.status)
            ) {
              localStorage.removeItem(cartKey(projectId));
              if (reportedPurchase.current !== data.order.id) {
                reportedPurchase.current = data.order.id;
                trackGrowthEvent(
                  "purchase",
                  { order_id: data.order.id },
                  `purchase:${data.order.id}`,
                );
              }
            }
          }
        })
        .catch(() => undefined);
      attempts += 1;
      if (
        attempts < 20 &&
        !["paid", "fulfilled", "completed", "cancelled"].includes(
          orderStatus?.status || "",
        )
      )
        window.setTimeout(check, 3000);
    };
    void check();
  }, [orderId, projectId]);

  const updateCart = (productId: string, quantity: number) => {
    const next = cart
      .map((line) =>
        line.productId === productId ? { ...line, quantity } : line,
      )
      .filter((line) => line.quantity > 0);
    localStorage.setItem(cartKey(projectId), JSON.stringify(next));
    setCart(next);
    setRates([]);
    setSelectedRate("");
  };
  const setField = (
    target: "customer" | "shipping",
    key: string,
    value: string,
  ) => {
    if (target === "customer")
      setCustomer((current) => ({ ...current, [key]: value }));
    else setShippingAddress((current) => ({ ...current, [key]: value }));
    setRates([]);
    setSelectedRate("");
  };
  const addressForm = (
    target: "customer" | "shipping",
    value: Address | Customer,
  ) => (
    <div className="grid gap-3 sm:grid-cols-2">
      {(
        (target === "customer"
          ? [
              ["name", "Full name", "text"],
              ["email", "Email", "email"],
              ["phone", "Phone", "tel"],
              ["country", "Country code", "text"],
            ]
          : [
              ["name", "Full name", "text"],
              ["phone", "Phone", "tel"],
              ["address1", "Address", "text"],
              ["address2", "Apartment / suite", "text"],
              ["city", "City", "text"],
              ["state", "State / province", "text"],
              ["postalCode", "Postal code", "text"],
              ["country", "Country code", "text"],
            ]) as Array<[string, string, string]>
      ).map(([key, label, type]) => (
        <label className="grid gap-1.5 text-sm" key={`${target}-${key}`}>
          {label}
          <input
            type={type}
            autoComplete={key === "country" ? "country" : undefined}
            value={value[key as keyof typeof value] ?? ""}
            maxLength={key === "country" ? 2 : undefined}
            onChange={(event) => setField(target, key, event.target.value)}
            className="h-10 rounded-md border border-neutral-300 bg-white px-3 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          />
        </label>
      ))}
    </div>
  );

  const getRates = async () => {
    setLoadingRates(true);
    setError("");
    try {
      const response = await fetch(
        `${apiBase}/api/public/projects/${projectId}/shipping-rates`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: { ...shippingAddress, email: customer.email },
            items: cart.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not get shipping rates");
      setRates(data.rates ?? []);
      setSelectedRate(data.rates?.[0]?.quoteToken ?? "");
      if (!data.rates?.length)
        setError("No shipping services are available for this address.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not get shipping rates",
      );
    } finally {
      setLoadingRates(false);
    }
  };

  const checkout = async () => {
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(
        `${apiBase}/api/public/projects/${projectId}/checkout/session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": checkoutKey,
          },
          body: JSON.stringify({
            idempotencyKey: checkoutKey,
            customer,
            shippingAddress: physical
              ? { ...shippingAddress, email: customer.email }
              : undefined,
            items: cart.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
            shippingQuote: physical ? selectedRate : undefined,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not start checkout");
      setOrderId(data.orderId);
      trackGrowthEvent("checkout_started", { order_id: data.orderId });
      if (data.checkoutUrl) window.location.assign(data.checkoutUrl);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not start checkout",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (orderId)
    return (
      <main className="mx-auto max-w-2xl px-5 py-14 text-foreground">
        <section className="rounded-xl border border-border bg-background p-7">
          <p className="text-sm text-muted-foreground">
            Order {orderId.slice(0, 8)}
          </p>
          <h1 className="mt-2 text-2xl">
            {["paid", "fulfilled", "completed"].includes(
              orderStatus?.status || "",
            )
              ? "Payment confirmed"
              : "Waiting for payment confirmation"}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {orderStatus
              ? `Order status: ${orderStatus.status}. Total: ${money(Number(orderStatus.total), currency)}.`
              : "Your payment provider is processing the checkout. This page will update when confirmation arrives."}
          </p>
          <a
            href="/"
            className="mt-6 inline-flex rounded-md border border-border px-4 py-2 text-sm"
          >
            Continue shopping
          </a>
        </section>
      </main>
    );

  if (kind === "cart")
    return (
      <main className="mx-auto max-w-4xl px-5 py-10 text-foreground">
        <h1 className="text-2xl">{experimentHeadline || "Your cart"}</h1>
        {!cartProducts.length ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Your cart is empty.
          </p>
        ) : (
          <div className="mt-6 space-y-3">
            {cartProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background p-4"
              >
                <div className="flex items-center gap-3">
                  {product.image && (
                    <img
                      src={product.image}
                      alt=""
                      className="h-16 w-16 rounded-md object-cover"
                    />
                  )}
                  <div>
                    <p>{product.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {money(Number(product.price || 0), currency)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    aria-label={`Quantity for ${product.name}`}
                    type="number"
                    min={0}
                    max={99}
                    value={product.quantity}
                    onChange={(event) =>
                      updateCart(product.id, Number(event.target.value))
                    }
                    className="h-9 w-20 rounded-md border border-border bg-background px-2"
                  />
                  <span className="min-w-24 text-right">
                    {money(
                      Number(product.price || 0) * product.quantity,
                      currency,
                    )}
                  </span>
                </div>
              </div>
            ))}
            <div className="flex justify-end pt-3 text-lg">
              Subtotal: {money(subtotal, currency)}
            </div>
            {purchaseMode === "checkout" ? (
              <a
                data-growth-variant-button
                href="/checkout"
                className="mt-2 inline-flex rounded-md bg-[var(--color-primary,#111827)] px-5 py-3 text-sm text-white"
              >
                {experimentButtonText || "Continue to checkout"}
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">
                Online checkout is not enabled for this store.
              </p>
            )}
          </div>
        )}
      </main>
    );

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-5 py-10 text-foreground lg:grid-cols-[minmax(0,1fr)_340px]">
      <div>
        <h1 className="text-2xl">{experimentHeadline || "Checkout"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your details to continue to secure payment.
        </p>
        {!cartProducts.length ? (
          <p className="mt-6 rounded-lg border border-border p-5 text-sm">
            Your cart is empty.{" "}
            <a className="underline" href="/">
              Return to the store
            </a>
          </p>
        ) : (
          <div className="mt-6 space-y-6">
            <section className="rounded-xl border border-border bg-background p-5">
              <h2 className="mb-4 text-base">Contact information</h2>
              {addressForm("customer", customer)}
            </section>
            {physical && (
              <section className="rounded-xl border border-border bg-background p-5">
                <h2 className="mb-4 text-base">Shipping address</h2>
                {addressForm("shipping", shippingAddress)}
                <button
                  type="button"
                  disabled={
                    loadingRates ||
                    !customer.email ||
                    !shippingAddress.name ||
                    !shippingAddress.address1 ||
                    !shippingAddress.city ||
                    !shippingAddress.state ||
                    !shippingAddress.postalCode ||
                    !shippingAddress.country
                  }
                  onClick={() => void getRates()}
                  className="mt-4 rounded-md border border-border px-4 py-2 text-sm disabled:opacity-50"
                >
                  {loadingRates ? "Checking rates…" : "Get shipping rates"}
                </button>
                {rates.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {rates.map((rate) => (
                      <label
                        key={rate.quoteToken}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-border p-3 text-sm"
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="shipping-rate"
                            checked={selectedRate === rate.quoteToken}
                            onChange={() => setSelectedRate(rate.quoteToken)}
                          />
                          <span>
                            {rate.label}
                            <small className="ml-2 text-muted-foreground">
                              {rate.provider}
                              {rate.estimatedDays
                                ? ` · ${rate.estimatedDays} days`
                                : ""}
                            </small>
                          </span>
                        </span>
                        <span>{money(rate.amount, rate.currency)}</span>
                      </label>
                    ))}
                  </div>
                )}
              </section>
            )}
            {cartProducts.some(
              (product) => product.productKind === "physical",
            ) &&
              cartProducts.some(
                (product) => product.productKind !== "physical",
              ) && (
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                  Please check out physical and digital products separately.
                </p>
              )}
            {error && (
              <p
                role="alert"
                className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
              >
                {error}
              </p>
            )}
            <button
              type="button"
              disabled={
                submitting ||
                !cartProducts.length ||
                !customer.name ||
                !customer.email ||
                !customer.country ||
                (physical && !selectedRate) ||
                (physical &&
                  cartProducts.some(
                    (product) => product.productKind !== "physical",
                  ))
              }
              onClick={() => void checkout()}
              data-growth-variant-button
              className="w-full rounded-md bg-[var(--color-primary,#111827)] px-5 py-3 text-sm text-white disabled:opacity-50"
            >
              {submitting
                ? "Opening secure checkout…"
                : experimentButtonText || "Continue to payment"}
            </button>
          </div>
        )}
      </div>
      <aside className="h-fit rounded-xl border border-border bg-background p-5">
        <h2 className="text-base">Order summary</h2>
        <div className="mt-4 space-y-3">
          {cartProducts.map((product) => (
            <div
              key={product.id}
              className="flex justify-between gap-3 text-sm"
            >
              <span>
                {product.name} × {product.quantity}
              </span>
              <span>
                {money(Number(product.price || 0) * product.quantity, currency)}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{money(subtotal, currency)}</span>
          </div>
          {physical && (
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>
                {activeRate
                  ? money(activeRate.amount, currency)
                  : "Choose a rate"}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-3 text-base">
            <span>Total</span>
            <span>{money(total, currency)}</span>
          </div>
        </div>
      </aside>
    </main>
  );
}

export function CheckoutResult({
  projectId,
  type,
}: {
  projectId: string;
  type: "success" | "cancel";
}) {
  const [order, setOrder] = useState<{ id: string; status: string } | null>(
    null,
  );
  const [error, setError] = useState("");
  const reportedPurchase = useRef("");
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("order");
    if (!id || type === "cancel") return;
    let attempts = 0;
    const poll = async () => {
      try {
        const response = await fetch(
          `${apiBase}/api/public/projects/${projectId}/orders/${id}`,
          { cache: "no-store" },
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Could not verify order status");
        setOrder(data.order);
        if (
          data.order.status === "paid" ||
          data.order.status === "fulfilled" ||
          data.order.status === "completed"
        ) {
          localStorage.removeItem(cartKey(projectId));
          if (reportedPurchase.current !== data.order.id) {
            reportedPurchase.current = data.order.id;
            trackGrowthEvent(
              "purchase",
              { order_id: data.order.id },
              `purchase:${data.order.id}`,
            );
          }
        }
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Could not verify payment",
        );
      }
      attempts += 1;
      if (
        attempts < 20 &&
        !["paid", "fulfilled", "completed", "cancelled"].includes(
          order?.status || "",
        )
      )
        window.setTimeout(poll, 3000);
    };
    void poll();
  }, [projectId, type]);
  return (
    <main className="mx-auto max-w-2xl px-5 py-14 text-foreground">
      <section className="rounded-xl border border-border bg-background p-7">
        <p className="text-sm text-muted-foreground">
          {type === "success" ? "Payment" : "Checkout"}
        </p>
        <h1 className="mt-2 text-2xl">
          {type === "cancel"
            ? "Checkout cancelled"
            : order?.status === "paid" || order?.status === "fulfilled"
              ? "Payment confirmed"
              : "Confirming your payment"}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {type === "cancel"
            ? "No payment was confirmed. You can return to your cart and try again."
            : error ||
              (order
                ? `Order status: ${order.status}.`
                : "This may take a few moments while the provider confirms your payment.")}
        </p>
        <a
          href={type === "cancel" ? "/cart" : "/"}
          className="mt-6 inline-flex rounded-md border border-border px-4 py-2 text-sm"
        >
          {type === "cancel" ? "Return to cart" : "Continue shopping"}
        </a>
      </section>
    </main>
  );
}
