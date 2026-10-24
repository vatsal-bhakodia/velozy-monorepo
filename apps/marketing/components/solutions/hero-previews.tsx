import { IndustryImage } from "./industry-image";
import { ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";

export type HeroPreviewTheme = {
  accent: string;
  text: string;
  muted: string;
  border: string;
  softSurface: string;
};

export type HeroOfferCardContent = {
  title: string;
  detail: string;
  meta: string;
  action: string;
  image: string | null;
  imageAlt: string;
  price?: string;
  priceDetail?: string;
  quantity?: number;
};

export type HeroAppointmentContent = {
  kind: "calendar";
  title: string;
  month: string;
  selectedDay: number;
  appointmentTitle: string;
  appointmentTime: string;
  appointmentDetail: string;
  action: string;
  notice: string;
};

export type HeroDetailsContent = {
  kind: "details";
  title: string;
  rows: { label: string; value: string }[];
  action: string;
  footer: string;
};

export type HeroDonationContent = {
  kind: "donation";
  title: string;
  description: string;
  frequencies: string[];
  amounts: string[];
  action: string;
  notice: string;
};

export type HeroPickupContent = {
  kind: "pickup";
  title: string;
  item: string;
  itemDetail: string;
  price: string;
  pickupTime: string;
  location: string;
  action: string;
  notice: string;
};

export type HeroReservationContent = {
  kind: "reservation";
  title: string;
  date: string;
  partySize: string;
  timeSlots: string[];
  action: string;
  notice: string;
};

export type HeroTimetableContent = {
  kind: "timetable";
  title: string;
  dayLabel: string;
  classes: { time: string; name: string }[];
  action: string;
  notice: string;
};

export type HeroSecondaryContent =
  | HeroAppointmentContent
  | HeroDetailsContent
  | HeroDonationContent
  | HeroPickupContent
  | HeroReservationContent
  | HeroTimetableContent;

export function HeroOfferCard({
  content,
  theme,
}: {
  content: HeroOfferCardContent;
  theme: HeroPreviewTheme;
}) {
  return (
    <div
      className="overflow-hidden rounded-md bg-white p-2 shadow-[0_24px_70px_rgba(0,0,0,.16)]"
      style={{ color: theme.text, border: `1px solid ${theme.border}` }}
    >
      <div className="relative aspect-[5/4] overflow-hidden rounded-md">
        <IndustryImage
          src={content.image}
          alt={content.imageAlt}
          sizes="(max-width: 768px) 42vw, 230px"
        />
      </div>
      <div className="px-1 pb-1 pt-3">
        <p className="text-sm font-semibold leading-tight tracking-tight">
          {content.title}
        </p>
        <p
          className="mt-1 text-[10px] leading-4"
          style={{ color: theme.muted }}
        >
          {content.detail}
        </p>
        <p className="text-[10px] leading-4" style={{ color: theme.muted }}>
          {content.meta}
        </p>
        {content.price ? (
          <>
            <p className="mt-2 text-[13px] font-bold leading-4">
              {content.price}
            </p>
            {content.priceDetail ? (
              <p
                className="text-[8px] leading-3"
                style={{ color: theme.muted }}
              >
                {content.priceDetail}
              </p>
            ) : null}
          </>
        ) : null}
        {content.quantity ? (
          <div className="mt-3 flex items-center gap-2">
            <div
              aria-hidden="true"
              className="flex h-8 shrink-0 items-center gap-2 rounded-md px-2 text-[10px] font-semibold"
              style={{ backgroundColor: theme.softSurface, color: theme.text }}
            >
              <span className="text-sm font-normal">−</span>
              <span>{content.quantity}</span>
              <span className="text-sm font-normal">+</span>
            </div>
            <div
              className="flex min-h-8 flex-1 items-center justify-center rounded-md px-1 text-center text-[9px] font-semibold leading-3 text-white"
              style={{ backgroundColor: theme.accent }}
            >
              {content.action}
            </div>
          </div>
        ) : (
          <div
            className="mt-3 rounded-md py-2 text-center text-[10px] font-semibold leading-3 text-white"
            style={{ backgroundColor: theme.accent }}
          >
            {content.action}
          </div>
        )}
      </div>
    </div>
  );
}

export function HeroDetailsCard({
  content,
  theme,
}: {
  content: HeroDetailsContent;
  theme: HeroPreviewTheme;
}) {
  return (
    <div
      className="rounded-md bg-white p-3.5 text-left shadow-[0_24px_70px_rgba(0,0,0,.16)] sm:p-4"
      style={{ color: theme.text, border: `1px solid ${theme.border}` }}
    >
      <p
        className="border-b pb-3 text-center text-[10px] font-semibold"
        style={{ borderColor: theme.border }}
      >
        {content.title}
      </p>
      <div className="divide-y" style={{ borderColor: theme.border }}>
        {content.rows.map((row) => (
          <div key={row.label} className="py-2.5">
            <p className="text-[8px]" style={{ color: theme.muted }}>
              {row.label}
            </p>
            <p className="mt-0.5 text-[10px] font-semibold">{row.value}</p>
          </div>
        ))}
      </div>
      <span
        className="mt-2 block rounded-md px-2 py-2 text-center text-[9px] font-semibold text-white"
        style={{ backgroundColor: theme.accent }}
      >
        {content.action}
      </span>
      <p
        className="mt-2 rounded-md px-2 py-2 text-[9px] leading-4"
        style={{ backgroundColor: theme.softSurface }}
      >
        {content.footer}
      </p>
    </div>
  );
}

export function HeroDonationCard({
  content,
  theme,
}: {
  content: HeroDonationContent;
  theme: HeroPreviewTheme;
}) {
  return (
    <div
      className="rounded-md bg-white p-3.5 text-left shadow-[0_24px_70px_rgba(0,0,0,.16)] sm:p-4"
      style={{ color: theme.text, border: `1px solid ${theme.border}` }}
    >
      <p className="text-[10px] font-semibold">{content.title}</p>
      <p className="mt-1 text-[8px] leading-3" style={{ color: theme.muted }}>
        {content.description}
      </p>
      <div
        className="mt-3 grid grid-cols-2 gap-1 rounded-md p-1"
        style={{ backgroundColor: theme.softSurface }}
      >
        {content.frequencies.map((frequency, index) => (
          <span
            key={frequency}
            className="rounded px-1 py-1.5 text-center text-[8px] font-medium"
            style={
              index === 0
                ? { backgroundColor: "#fff", color: theme.text }
                : { color: theme.muted }
            }
          >
            {frequency}
          </span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1">
        {content.amounts.map((amount, index) => (
          <span
            key={amount}
            className="rounded-md border px-1 py-2 text-center text-[8px] font-semibold"
            style={
              index === 1
                ? { borderColor: theme.accent, color: theme.accent }
                : { borderColor: theme.border, color: theme.text }
            }
          >
            {amount}
          </span>
        ))}
      </div>
      <span
        className="mt-3 block rounded-md px-2 py-2 text-center text-[9px] font-semibold text-white"
        style={{ backgroundColor: theme.accent }}
      >
        {content.action}
      </span>
      <p className="mt-2 text-[8px] leading-3" style={{ color: theme.muted }}>
        {content.notice}
      </p>
    </div>
  );
}

export function HeroPickupCard({
  content,
  theme,
}: {
  content: HeroPickupContent;
  theme: HeroPreviewTheme;
}) {
  return (
    <div
      className="rounded-md bg-white p-3.5 text-left shadow-[0_24px_70px_rgba(0,0,0,.16)] sm:p-4"
      style={{ color: theme.text, border: `1px solid ${theme.border}` }}
    >
      <p
        className="border-b pb-2.5 text-center text-[10px] font-semibold"
        style={{ borderColor: theme.border }}
      >
        {content.title}
      </p>
      <div className="mt-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-[9px] font-semibold">{content.item}</p>
          <p
            className="mt-0.5 text-[8px] leading-3"
            style={{ color: theme.muted }}
          >
            {content.itemDetail}
          </p>
        </div>
        <span className="text-[9px] font-semibold">{content.price}</span>
      </div>
      <div
        className="mt-3 space-y-2 rounded-md p-2"
        style={{ backgroundColor: theme.softSurface }}
      >
        <div>
          <p className="text-[7px]" style={{ color: theme.muted }}>
            Pickup time
          </p>
          <p className="mt-0.5 text-[8px] font-semibold">
            {content.pickupTime}
          </p>
        </div>
        <div>
          <p className="text-[7px]" style={{ color: theme.muted }}>
            Pickup location
          </p>
          <p className="mt-0.5 text-[8px] font-semibold">{content.location}</p>
        </div>
      </div>
      <span
        className="mt-3 block rounded-md px-2 py-2 text-center text-[9px] font-semibold text-white"
        style={{ backgroundColor: theme.accent }}
      >
        {content.action}
      </span>
      <p className="mt-2 text-[8px] leading-3" style={{ color: theme.muted }}>
        {content.notice}
      </p>
    </div>
  );
}

export function HeroReservationCard({
  content,
  theme,
}: {
  content: HeroReservationContent;
  theme: HeroPreviewTheme;
}) {
  return (
    <div
      className="rounded-md bg-white p-3.5 text-left shadow-[0_24px_70px_rgba(0,0,0,.16)] sm:p-4"
      style={{ color: theme.text, border: `1px solid ${theme.border}` }}
    >
      <p
        className="border-b pb-2.5 text-center text-[10px] font-semibold"
        style={{ borderColor: theme.border }}
      >
        {content.title}
      </p>
      <div className="mt-3 flex items-center justify-between text-[8px]">
        <span className="font-semibold">{content.date}</span>
        <span style={{ color: theme.muted }}>{content.partySize}</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {content.timeSlots.map((time, index) => (
          <span
            key={time}
            className="rounded-md border px-1 py-2 text-center text-[8px] font-medium"
            style={
              index === 1
                ? { borderColor: theme.accent, color: theme.accent }
                : { borderColor: theme.border, color: theme.text }
            }
          >
            {time}
          </span>
        ))}
      </div>
      <span
        className="mt-3 block rounded-md px-2 py-2 text-center text-[9px] font-semibold text-white"
        style={{ backgroundColor: theme.accent }}
      >
        {content.action}
      </span>
      <p className="mt-2 text-[8px] leading-3" style={{ color: theme.muted }}>
        {content.notice}
      </p>
    </div>
  );
}

export function HeroTimetableCard({
  content,
  theme,
}: {
  content: HeroTimetableContent;
  theme: HeroPreviewTheme;
}) {
  return (
    <div
      className="rounded-md bg-white p-3.5 text-left shadow-[0_24px_70px_rgba(0,0,0,.16)] sm:p-4"
      style={{ color: theme.text, border: `1px solid ${theme.border}` }}
    >
      <p
        className="border-b pb-2.5 text-center text-[10px] font-semibold"
        style={{ borderColor: theme.border }}
      >
        {content.title}
      </p>
      <p
        className="mt-3 text-[8px] font-semibold"
        style={{ color: theme.muted }}
      >
        {content.dayLabel}
      </p>
      <div className="mt-1 divide-y" style={{ borderColor: theme.border }}>
        {content.classes.map((item) => (
          <div
            key={item.time + item.name}
            className="flex items-center justify-between gap-2 py-2"
          >
            <span className="text-[8px]" style={{ color: theme.muted }}>
              {item.time}
            </span>
            <span className="text-right text-[8px] font-semibold">
              {item.name}
            </span>
          </div>
        ))}
      </div>
      <span
        className="mt-2 block rounded-md px-2 py-2 text-center text-[9px] font-semibold text-white"
        style={{ backgroundColor: theme.accent }}
      >
        {content.action}
      </span>
      <p className="mt-2 text-[8px] leading-3" style={{ color: theme.muted }}>
        {content.notice}
      </p>
    </div>
  );
}

export function HeroAppointmentCard({
  content,
  theme,
}: {
  content: HeroAppointmentContent;
  theme: HeroPreviewTheme;
}) {
  const date = new Date(`${content.month}T00:00:00Z`);
  const offset = date.getUTCDay();
  const days = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const month = new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);

  return (
    <div
      className="rounded-md bg-white p-3.5 text-left shadow-[0_24px_70px_rgba(0,0,0,.16)] sm:p-4"
      style={{ color: theme.text, border: `1px solid ${theme.border}` }}
    >
      <div
        className="flex items-center gap-2 border-b pb-2.5"
        style={{ borderColor: theme.border }}
      >
        <ChevronLeft aria-hidden="true" className="h-3 w-3" />
        <p className="flex-1 text-center text-[10px] font-semibold">
          {content.title}
        </p>
        <MessageSquare
          aria-hidden="true"
          className="h-3 w-3"
          strokeWidth={1.75}
        />
      </div>
      <div className="mt-2.5 flex items-center justify-between px-1 text-[9px] font-medium">
        <ChevronLeft aria-hidden="true" className="h-3 w-3" />
        {month}
        <ChevronRight aria-hidden="true" className="h-3 w-3" />
      </div>
      <div className="mt-1 grid grid-cols-7 text-center text-[8px] leading-5">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <span key={day} className="text-[7px]" style={{ color: theme.muted }}>
            {day}
          </span>
        ))}
        {Array.from({ length: offset }, (_, index) => (
          <span key={`empty-${index}`} />
        ))}
        {Array.from({ length: days }, (_, index) => {
          const day = index + 1;
          const selected = day === content.selectedDay;
          return (
            <span key={day} className="flex justify-center">
              <span
                className="flex h-4 w-4 items-center justify-center rounded-full"
                style={
                  selected
                    ? {
                        backgroundColor: theme.accent,
                        color: "#fff",
                        fontWeight: 600,
                      }
                    : undefined
                }
              >
                {day}
              </span>
            </span>
          );
        })}
      </div>
      <div
        className="mt-2.5 rounded-md px-2 py-1.5"
        style={{ backgroundColor: theme.softSurface }}
      >
        <p className="text-[8px] font-medium" style={{ color: theme.muted }}>
          {content.appointmentTime}
        </p>
        <p className="mt-0.5 text-[9px] font-semibold">
          {content.appointmentTitle}
        </p>
        <p className="mt-0.5 text-[8px]" style={{ color: theme.muted }}>
          {content.appointmentDetail}
        </p>
      </div>
      <span
        className="mt-2 block rounded-md px-2 py-1.5 text-center text-[8px] font-semibold text-white"
        style={{ backgroundColor: theme.accent }}
      >
        {content.action}
      </span>
      <p className="mt-2 text-[8px] leading-3" style={{ color: theme.muted }}>
        {content.notice}
      </p>
    </div>
  );
}

export function HeroSecondaryCard({
  content,
  theme,
}: {
  content: HeroSecondaryContent;
  theme: HeroPreviewTheme;
}) {
  switch (content.kind) {
    case "calendar":
      return <HeroAppointmentCard content={content} theme={theme} />;
    case "details":
      return <HeroDetailsCard content={content} theme={theme} />;
    case "donation":
      return <HeroDonationCard content={content} theme={theme} />;
    case "pickup":
      return <HeroPickupCard content={content} theme={theme} />;
    case "reservation":
      return <HeroReservationCard content={content} theme={theme} />;
    case "timetable":
      return <HeroTimetableCard content={content} theme={theme} />;
    default:
      return null;
  }
}
