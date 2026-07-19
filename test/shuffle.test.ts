import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shuffleArray, weightedSample } from "../src/lib/shuffle";

describe("shuffleArray", () => {
  it("returns a permutation of the input", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const output = shuffleArray(input);
    assert.equal(output.length, input.length);
    assert.deepEqual([...output].sort((a, b) => a - b), input);
    assert.notEqual(output, input);
  });
});

describe("weightedSample", () => {
  it("returns the requested count without duplicates", () => {
    const input = Array.from({ length: 40 }, (_, i) => i);
    const sample = weightedSample(input, 5);
    assert.equal(sample.length, 5);
    assert.equal(new Set(sample).size, 5);
    for (const value of sample) {
      assert.ok(input.includes(value));
    }
  });

  it("is not dominated by the first few popular indexes across runs", () => {
    const input = Array.from({ length: 30 }, (_, i) => i);
    const topHits = new Set<number>();
    for (let run = 0; run < 40; run += 1) {
      const [first] = weightedSample(input, 1);
      topHits.add(first);
    }
    // Across many runs we should see more than just indexes 0-2.
    assert.ok(topHits.size >= 5, `expected diverse picks, got ${[...topHits]}`);
  });
});
