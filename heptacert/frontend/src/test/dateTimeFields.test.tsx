import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import DateField, { parseDateValue, toDateValue } from "@/components/Admin/DateField";
import { joinDateTime, splitDateTime } from "@/components/Admin/DateTimeField";
import TimeField, { isTimeValue, parseTypedTime } from "@/components/Admin/TimeField";

vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({
    lang: "de",
    t: (key: string) => ({
      date_picker_placeholder: "Datum auswählen",
      date_picker_dialog_label: "Datum auswählen",
      time_picker_placeholder: "Uhrzeit auswählen",
      time_picker_dialog_label: "Uhrzeit auswählen",
      time_picker_type_label: "Uhrzeit eingeben",
      time_picker_invalid: "Gültige Uhrzeit eingeben",
      picker_clear: "Löschen",
      picker_today: "Heute",
      picker_done: "Fertig",
      picker_hour: "Stunde",
      picker_minute: "Minute",
    } as Record<string, string>)[key] ?? key,
  }),
}));

beforeAll(() => {
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
});

afterEach(cleanup);

describe("date and time value contracts", () => {
  it("round-trips local calendar dates without converting them to UTC", () => {
    const date = parseDateValue("2026-03-29");
    expect(date).not.toBeNull();
    expect(toDateValue(date!)).toBe("2026-03-29");
    expect(parseDateValue("2026-02-30")).toBeNull();
  });

  it("keeps the native datetime-local wire format", () => {
    expect(splitDateTime("2026-09-20T14:35:45")).toEqual({ date: "2026-09-20", time: "14:35" });
    expect(joinDateTime("2026-09-20", "14:35")).toBe("2026-09-20T14:35");
  });

  it("uses the local calendar day when time is chosen before a date", () => {
    const previousTimezone = process.env.TZ;
    process.env.TZ = "Europe/Istanbul";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-19T22:30:00.000Z"));
    try {
      expect(joinDateTime("", "09:00")).toBe("2026-09-20T09:00");
    } finally {
      vi.useRealTimers();
      process.env.TZ = previousTimezone;
    }
  });

  it("accepts both 24-hour and AM/PM typed times", () => {
    expect(parseTypedTime("9:30 pm")).toBe("21:30");
    expect(parseTypedTime("07.05")).toBe("07:05");
    expect(parseTypedTime("25:00")).toBeNull();
    expect(isTimeValue("23:59")).toBe(true);
  });
});

describe("localized picker interactions", () => {
  it("renders a German calendar, supports arrow selection and restores focus on Escape", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<DateField label="Datum" value="2026-01-15" onChange={onChange} />);
    const trigger = screen.getByRole("button", { name: "Datum" });

    await user.click(trigger);
    expect(screen.getByRole("dialog", { name: "Datum auswählen" })).toBeInTheDocument();
    expect(screen.getByText("Januar 2026")).toBeInTheDocument();
    expect(document.querySelector(".rdp-weekday")).toHaveTextContent("Mo");

    const selectedDay = document.querySelector(".rdp-selected button") as HTMLButtonElement;
    selectedDay.focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toHaveTextContent("16");
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("2026-01-16");
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("commits typed time in canonical HH:mm form", async () => {
    const onChange = vi.fn();
    render(<TimeField label="Uhrzeit" value="09:15" onChange={onChange} />);
    const trigger = screen.getByRole("button", { name: "Uhrzeit" });

    fireEvent.click(trigger);
    const input = screen.getByLabelText("Uhrzeit eingeben");
    fireEvent.change(input, { target: { value: "9:30 pm" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith("21:30");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
