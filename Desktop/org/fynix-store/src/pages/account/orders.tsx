import { h } from "fynixui";
export async function getServerSideProps() {
  return { props: {} };
}
export default function Orders() {
  return <div>Order History (SSR)</div>;
}
