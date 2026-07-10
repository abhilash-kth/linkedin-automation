export function random(min, max) {
  return Math.random() * (max - min) + min;
}

export async function randomDelay(min, max) {
  const delay = random(min, max);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}