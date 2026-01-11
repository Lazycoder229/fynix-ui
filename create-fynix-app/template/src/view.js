import { Fynix, Path } from "fynix-core";

export default function Home() {
  return (
    <div rc="flex flex-col min-h-screen bg-white text-gray-900 items-center justify-center px-6 py-16">
      {/* Logo & Title */}
      <img src="/fynixlogo.png" alt="Fynix Logo" rc="w-32 h-32 mb-6 logo" />
      <h1 rc="text-4xl font-bold mb-4">FynixJS</h1>

      {/* Steps */}
      <div rc="text-left mb-6">
        <p rc="text-lg text-gray-600 mb-2">
          1. Get started by editing <b>src/view.js</b>
        </p>
        <p rc="text-lg text-gray-600">
          2. Save and see your changes instantly
        </p>
        
      </div>

      {/* Link */}
     <div rc="flex space-x-4 mb-10">
  {/*
    Path component:
    - Used for navigation within the SPA or to external links.
    - 'to'  specifies the destination URL.
    - 'rc' is for styling (Tailwind classes here).
    - Use 'target="_blank"' and 'rel="noopener noreferrer"' for external links.
    - 'value' is the text displayed on the button/link.
  */}
  <Path
    to="https://github.com"
    rc="px-6 py-3 rounded-full bg-black text-white"
    target="_blank"
    rel="noopener noreferrer"
    value="Read our docs"
  />
  <Path to="/user" value="Go to user" props={Resty}/>
</div>


      {/* Footer */}
      <footer rc="text-center mt-16 text-gray-700">
        © 2025 FynixJS. All rights reserved.
      </footer>
    </div>
  );
}

// Static meta
Home.meta = {
  title: "Home - FynixJS",
  description: "Welcome to the FynixJS framework!",
  keywords: "fynix, javascript, framework",
  ogTitle: "FynixJS - Modern Web Framework",
  ogDescription: "Build fast web apps with FynixJS",
  ogImage: "https://example.com/og-image.jpg",
  twitterCard: "summary_large_image",
};
