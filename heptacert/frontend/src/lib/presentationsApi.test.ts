import { beforeEach, describe, expect, it, vi } from "vitest";

import { presentationControlTokenFromUrl, uploadEventPresentation } from "@/lib/presentationsApi";

class FakeXMLHttpRequest {
  static latest: FakeXMLHttpRequest;

  method = "";
  url = "";
  timeout = 0;
  status = 0;
  responseText = "";
  body: Document | XMLHttpRequestBodyInit | null = null;
  headers: Record<string, string> = {};
  upload = { onprogress: null as ((event: ProgressEvent) => void) | null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  onabort: (() => void) | null = null;

  constructor() {
    FakeXMLHttpRequest.latest = this;
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }

  send(body: Document | XMLHttpRequestBodyInit | null) {
    this.body = body;
  }

  progress(loaded: number, total: number) {
    this.upload.onprogress?.({ lengthComputable: true, loaded, total } as ProgressEvent);
  }

  respond(status: number, body: unknown) {
    this.status = status;
    this.responseText = JSON.stringify(body);
    this.onload?.();
  }
}

describe("presentation upload API", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("heptacert_token", "test-token");
    localStorage.setItem("heptacert_organization_id", "42");
    localStorage.setItem("heptacert-lang", "en");
    vi.stubGlobal("XMLHttpRequest", FakeXMLHttpRequest);
  });

  it("sends auth context and reports upload progress", async () => {
    const progress: number[] = [];
    const file = new File(["%PDF-1.7\n%%EOF"], "deck.pdf", { type: "application/pdf" });
    const resultPromise = uploadEventPresentation(
      7,
      { title: "Demo", description: "Quarterly", language: "en", file },
      (value) => progress.push(value)
    );
    const xhr = FakeXMLHttpRequest.latest;

    expect(xhr.method).toBe("POST");
    expect(xhr.url).toBe("http://localhost:3000/api/admin/presentations/events/7/upload");
    expect(xhr.timeout).toBe(300_000);
    expect(xhr.headers).toMatchObject({
      Authorization: "Bearer test-token",
      "X-Organization-Id": "42",
      "X-App-Lang": "en",
    });
    expect(xhr.body).toBeInstanceOf(FormData);
    expect((xhr.body as FormData).get("file")).toBe(file);
    expect(progress).toEqual([0]);

    xhr.progress(50, 100);
    xhr.respond(201, { id: 9, title: "Demo" });

    await expect(resultPromise).resolves.toMatchObject({ id: 9, title: "Demo" });
    expect(progress).toEqual([0, 50, 100]);
  });

  it("surfaces the API detail for rejected files", async () => {
    const file = new File(["not a pdf"], "fake.pdf", { type: "application/pdf" });
    const resultPromise = uploadEventPresentation(7, { title: "Bad", language: "en", file });
    FakeXMLHttpRequest.latest.respond(400, { detail: "The uploaded file is not a valid PDF" });

    await expect(resultPromise).rejects.toEqual(
      expect.objectContaining({ status: 400, message: "The uploaded file is not a valid PDF" })
    );
  });
});

describe("presentation URL helpers", () => {
  it("extracts and decodes presenter control tokens", () => {
    expect(presentationControlTokenFromUrl("/presenter/demo%2Ftoken?mode=remote")).toBe("demo/token");
    expect(presentationControlTokenFromUrl(null)).toBeNull();
  });
});
