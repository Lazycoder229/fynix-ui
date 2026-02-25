import { h } from "fynixui";
export async function getStaticPaths() {
  return { paths: [] };
}
export async function getStaticProps() {
  return { props: {} };
}
export default function ProductDetail() {
  return <div>Product Detail (SSG + Dynamic Paths)</div>;
}
