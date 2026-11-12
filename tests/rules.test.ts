import { test } from "node:test";
import assert from "node:assert/strict";
import { submissionStatus, needsContact, capacityFilledPct, spotsOpen, lastContactLabel } from "../src/lib/rules.ts";

const now = new Date("2026-11-12T12:00:00Z");
const ago = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();

test("submission status", () => {
  assert.equal(submissionStatus(ago(10), now), "On time");
  assert.equal(submissionStatus(ago(42), now), "On time");
  assert.equal(submissionStatus(ago(43), now), "Overdue");
  assert.equal(submissionStatus(null, now), "Never submitted");
});
test("needs contact", () => {
  assert.equal(needsContact(null, now), true);
  assert.equal(needsContact(ago(28).slice(0, 10), now), false);
  assert.equal(needsContact(ago(30).slice(0, 10), now), true);
  assert.equal(needsContact(ago(3).slice(0, 10), now), false);
});
test("capacity", () => {
  assert.equal(capacityFilledPct([{ capacity: 10, enrolled: 5 }, { capacity: 10, enrolled: 10 }, { capacity: null, enrolled: 99 }]), 75);
  assert.equal(capacityFilledPct([{ capacity: null, enrolled: 3 }]), null);
  assert.equal(spotsOpen({ capacity: 10, enrolled: 12 }), 0);
  assert.equal(spotsOpen({ capacity: 10, enrolled: 4 }), 6);
});
test("last contact label", () => {
  assert.equal(lastContactLabel(null, now), "No contact yet");
  assert.equal(lastContactLabel(ago(5).slice(0, 10), now), "5 days ago");
});
