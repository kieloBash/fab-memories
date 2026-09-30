// test-harness/unit/email-send.unit.test.ts
//
// lib/email/send.ts — the only place email leaves the system.
// Checks: which Gmail transport is chosen from the environment, that every attempt is written to the
// EmailLog (the evidence that an email was really sent), and that failures NEVER throw.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const h = vi.hoisted(() => ({
  logRows: [] as any[],
  logFails: false,
  sendMail: vi.fn(),
  createTransport: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    emailLog: {
      create: async ({ data }: any) => {
        if (h.logFails) throw new Error("db down")
        h.logRows.push(data)
        return data
      },
    },
  },
}))
vi.mock("nodemailer", () => ({ default: { createTransport: h.createTransport } }))

import { _resetEmailTransportForTests, describeEmailTransport, sendEmail } from "@/lib/email/send"

const ENV_KEYS = ["GMAIL_USER", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN", "GMAIL_APP_PASSWORD"]
const saved: Record<string, string | undefined> = {}
const msg = { to: "client@example.com", subject: "Hello", text: "Hi", html: "<p>Hi</p>", kind: "BOOKING_CONFIRMED", bookingId: "bk_1" }

beforeEach(() => {
  for (const k of ENV_KEYS) { saved[k] = process.env[k]; delete process.env[k] }
  h.logRows.length = 0
  h.logFails = false
  h.sendMail.mockReset().mockResolvedValue({ messageId: "<abc@gmail.com>" })
  h.createTransport.mockReset().mockReturnValue({ sendMail: h.sendMail })
  _resetEmailTransportForTests()
  vi.spyOn(console, "log").mockImplementation(() => {})
  vi.spyOn(console, "error").mockImplementation(() => {})
})
afterEach(() => {
  for (const k of ENV_KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k] }
  vi.restoreAllMocks()
})

const oauthEnv = () => Object.assign(process.env, {
  GMAIL_USER: "fab@gmail.com", GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "secret", GOOGLE_REFRESH_TOKEN: "refresh",
})

describe("transport selection", () => {
  it("no credentials → console mode; nothing is sent; logged as LOGGED", async () => {
    const r = await sendEmail(msg)
    expect(r).toEqual({ sent: true, mode: "console" })
    expect(h.createTransport).not.toHaveBeenCalled()
    expect(h.logRows).toEqual([expect.objectContaining({ to: msg.to, status: "LOGGED", mode: "console", kind: "BOOKING_CONFIRMED", bookingId: "bk_1" })])
    expect(describeEmailTransport()).toEqual({ mode: "console", from: null })
  })

  it("GMAIL_USER + GOOGLE_* → Gmail OAuth2", async () => {
    oauthEnv()
    await sendEmail(msg)
    expect(h.createTransport).toHaveBeenCalledWith(expect.objectContaining({
      service: "gmail",
      auth: expect.objectContaining({ type: "OAuth2", user: "fab@gmail.com", refreshToken: "refresh" }),
    }))
    expect(describeEmailTransport().mode).toBe("gmail-oauth2")
  })

  it("GMAIL_USER + GMAIL_APP_PASSWORD → Gmail app password (spaces removed)", async () => {
    Object.assign(process.env, { GMAIL_USER: "fab@gmail.com", GMAIL_APP_PASSWORD: "abcd efgh ijkl mnop" })
    await sendEmail(msg)
    expect(h.createTransport).toHaveBeenCalledWith({ service: "gmail", auth: { user: "fab@gmail.com", pass: "abcdefghijklmnop" } })
    expect(describeEmailTransport().mode).toBe("gmail-app-password")
  })
})

describe("sending and the EmailLog", () => {
  it("success → sends text + html from 'Fab Memories Events <GMAIL_USER>' and logs SENT with the messageId", async () => {
    oauthEnv()
    const r = await sendEmail(msg)
    expect(r).toEqual({ sent: true, mode: "gmail-oauth2", messageId: "<abc@gmail.com>" })
    expect(h.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: "Fab Memories Events <fab@gmail.com>", to: msg.to, subject: "Hello", text: "Hi", html: "<p>Hi</p>",
    }))
    expect(h.logRows).toEqual([expect.objectContaining({ status: "SENT", mode: "gmail-oauth2", messageId: "<abc@gmail.com>" })])
  })

  it("Gmail refuses → returns sent:false (never throws) and logs FAILED with the error", async () => {
    oauthEnv()
    h.sendMail.mockRejectedValue(new Error("invalid_grant"))
    const r = await sendEmail(msg)
    expect(r).toEqual({ sent: false, mode: "gmail-oauth2", error: "invalid_grant" })
    expect(h.logRows).toEqual([expect.objectContaining({ status: "FAILED", error: "invalid_grant" })])
  })

  it("a broken EmailLog write never breaks sending", async () => {
    oauthEnv()
    h.logFails = true
    await expect(sendEmail(msg)).resolves.toMatchObject({ sent: true })
  })

  it("the body is never stored in the log", async () => {
    await sendEmail(msg)
    expect(h.logRows[0]).not.toHaveProperty("text")
    expect(h.logRows[0]).not.toHaveProperty("html")
  })
})
