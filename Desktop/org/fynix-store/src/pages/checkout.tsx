import { h } from "fynixui";
export async function getServerSideProps() {
  return { props: {} };
}
export default function Checkout() {
  return <div>Checkout (SSR)</div>;
}
