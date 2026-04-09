import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = (__ENV.BASE_URL || "http://localhost:8765").replace(/\/$/, "");
const EVENT_ID = __ENV.EVENT_ID || "1";
const AUTO_PICK_EVENT = (__ENV.AUTO_PICK_EVENT || "1") === "1";
const THINK_TIME_MIN = Number(__ENV.THINK_TIME_MIN || 1.0);
const THINK_TIME_MAX = Number(__ENV.THINK_TIME_MAX || 2.5);

export const options = {
  stages: [
    { duration: "1m", target: 100 },
    { duration: "2m", target: 100 },
    { duration: "1m", target: 200 },
    { duration: "2m", target: 200 },
    { duration: "1m", target: 400 },
    { duration: "2m", target: 400 },
    { duration: "1m", target: 600 },
    { duration: "2m", target: 600 },
    { duration: "1m", target: 0 }
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500", "p(99)<1200"]
  }
};

function randomThink() {
  const span = Math.max(0, THINK_TIME_MAX - THINK_TIME_MIN);
  return THINK_TIME_MIN + Math.random() * span;
}

export function setup() {
  if (!AUTO_PICK_EVENT) {
    return { eventId: String(EVENT_ID) };
  }

  const listRes = http.get(`${BASE_URL}/api/public/events?scope=all&limit=1&offset=0`);
  if (listRes.status !== 200) {
    throw new Error(`Failed to fetch public events list in setup (status=${listRes.status})`);
  }

  let parsed = [];
  try {
    parsed = JSON.parse(listRes.body || "[]");
  } catch (_err) {
    parsed = [];
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("No public events found. Provide EVENT_ID manually or create a public event.");
  }

  const picked = parsed[0];
  const pickedId = String(picked.public_id || picked.id || EVENT_ID);
  return { eventId: pickedId };
}

export default function (data) {
  const effectiveEventId = String(data?.eventId || EVENT_ID);
  const r = Math.random();

  if (r < 0.65) {
    const res = http.get(`${BASE_URL}/api/public/events`);
    check(res, {
      "public events list status is 200": (x) => x.status === 200
    });
  } else if (r < 0.9) {
    const res = http.get(`${BASE_URL}/api/public/events/${effectiveEventId}`);
    check(res, {
      "public event detail status is 200": (x) => x.status === 200
    });
  } else {
    const res = http.get(`${BASE_URL}/api/public/events/${effectiveEventId}/comments`);
    check(res, {
      "public comments status is 200": (x) => x.status === 200
    });
  }

  sleep(randomThink());
}
