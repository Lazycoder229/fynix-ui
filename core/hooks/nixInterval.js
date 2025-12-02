export function nixInterval(fn, ms) {
  const id = setInterval(fn, ms);
  return () => clearInterval(id);
}
