import { Fynix, nixStore, Button, Path } from "@fynix";

export default function App() {
  const count = nixStore("counter.value", 0);
  const name = nixStore("user.name", "Guest"); //Shared store

  return (
    <div>
      <h1>From App</h1>
      <p>Count: {count.value}</p>
      <p class="mb-4">Hello, {name.value}!</p>

      <button class="cn" r-click={() => count.value++}>
        Click
      </button>

      {/* No props needed! */}
      <Path to="/test" value="Go to Dashboard" />
      <Path to="/product" value="Go to tes Product" />
    </div>
  );
}
