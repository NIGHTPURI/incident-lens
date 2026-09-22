import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, request } from "./api";

afterEach(() => vi.unstubAllGlobals());

describe("control plane client", () => {
  it("preserves AFTER provenance when collecting recovery evidence", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response("[]", { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    await api.collect("session-1", "AFTER");
    expect(fetch).toHaveBeenCalledWith(
      "/api/sessions/session-1/evidence?phase=AFTER",
      expect.objectContaining({ method: "POST" }),
    );
  });
  it("sends a bounded JSON fault mutation with the session identifier encoded", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);
    await api.setFault("id/one", true, 350);
    expect(fetch).toHaveBeenCalledWith(
      "/api/sessions/id%2Fone/fault",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ enabled: true, parameter: 350 }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("surfaces the structured API problem rather than treating an error as data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            detail: "A different session owns the active fault.",
          }),
          { status: 409 },
        ),
      ),
    );
    await expect(api.setFault("session", true, 350)).rejects.toMatchObject({
      status: 409,
      message: "A different session owns the active fault.",
      detail: "A different session owns the active fault.",
    });
  });

  it("handles a non-JSON proxy failure safely", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("<html>Gateway error</html>", { status: 502 }),
        ),
    );
    const failure = request("/overview");
    await expect(failure).rejects.toBeInstanceOf(ApiError);
    await expect(failure).rejects.toMatchObject({
      status: 502,
      detail: undefined,
    });
  });

  it("does not add credentials or an LLM secret to a request", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response("[]", { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    await api.sessions();
    expect(fetch.mock.calls[0][1].headers).toEqual({
      Accept: "application/json",
    });
  });
});
