Using the Path Component
The Path component is a wrapper that simplifies navigation and automatically handles prop passing.
Basic Usage
typescript// Import the Path component
import { Path } from './components/Path'; // adjust path as needed

export default function MyComponent() {
return (

<div>
{/_ Simple navigation _/}
<Path to="/about" value="About Us" />

      {/* Navigate to home */}
      <Path to="/" value="Home" />

      {/* Navigate with styling */}
      <Path
        to="/contact"
        value="Contact"
        class="btn btn-primary"
      />
    </div>

);
}
Passing Props Between Routes
typescriptimport { Path } from './components/Path';
import { nixState } from './runtime';

export default function BlogList() {
const posts = [
{ id: 1, title: 'First Post', content: 'Lorem ipsum...', author: 'John' },
{ id: 2, title: 'Second Post', content: 'Dolor sit...', author: 'Jane' }
];

return (

<div>
{posts.map(post => (
<div key={post.id}>
<h3>{post.title}</h3>

          {/* Pass props to the destination route */}
          <Path
            to={`/blog/${post.id}`}
            value="Read More"
            props={{
              title: post.title,
              content: post.content,
              author: post.author,
              views: 0
            }}
          />
        </div>
      ))}
    </div>

);
}
Receiving Props in Destination Route
typescript// src/blog/[id]/view.tsx
export default function BlogPost({ params, title, content, author, views }) {
return (

<div>
<h1>{title || 'Untitled'}</h1>
<p>By: {author || 'Anonymous'}</p>
<p>Post ID: {params.id}</p>
<div>{content}</div>
<p>Views: {views || 0}</p>

      {/* Navigate back */}
      <Path to="/blog" value="← Back to Blog" />
    </div>

);
}
With Reactive State
typescriptimport { Path } from './components/Path';
import { nixState } from './runtime';

export default function UserProfile() {
const user = nixState({
id: 123,
name: 'John Doe',
email: 'john@example.com',
premium: true
});

return (

<div>
<h2>{user.value.name}</h2>

      {/* Pass reactive state as props */}
      <Path
        to="/settings"
        value="Edit Profile"
        props={{
          userId: user.value.id,
          userName: user.value.name,
          userEmail: user.value.email,
          isPremium: user.value.premium
        }}
      />
    </div>

);
}
Advanced Examples

1. Navigation Menu
   typescriptimport { Path } from './components/Path';

export default function Navbar() {
const menuItems = [
{ to: '/', label: 'Home' },
{ to: '/about', label: 'About' },
{ to: '/products', label: 'Products' },
{ to: '/contact', label: 'Contact' }
];

return (

<nav class="navbar">
{menuItems.map(item => (
<Path
          key={item.to}
          to={item.to}
          value={item.label}
          class="nav-link"
        />
))}
</nav>
);
} 2. Product Card with Props
typescriptimport { Path } from './components/Path';

export default function ProductCard({ product }) {
return (

<div class="product-card">
<img src={product.image} alt={product.name} />
<h3>{product.name}</h3>
<p>${product.price}</p>

      {/* Pass entire product object */}
      <Path
        to={`/product/${product.id}`}
        value="View Details"
        props={{
          productName: product.name,
          productPrice: product.price,
          productImage: product.image,
          productDescription: product.description,
          inStock: product.stock > 0
        }}
        class="btn btn-primary"
      />
    </div>

);
} 3. External Links
typescriptimport { Path } from './components/Path';

export default function Footer() {
return (

<footer>
{/_ External link (will not use SPA navigation) _/}
<Path
        to="https://github.com"
        value="GitHub"
        target="_blank"
        rel="noopener noreferrer"
        class="external-link"
      />

      {/* Internal navigation */}
      <Path to="/privacy" value="Privacy Policy" />
      <Path to="/terms" value="Terms of Service" />
    </footer>

);
} 4. Conditional Navigation
typescriptimport { Path } from './components/Path';

export default function Dashboard({ isAuthenticated, user }) {
return (

<div>
<h1>Dashboard</h1>

      {isAuthenticated ? (
        <Path
          to="/profile"
          value="My Profile"
          props={{
            userId: user.id,
            userName: user.name,
            userRole: user.role
          }}
        />
      ) : (
        <Path
          to="/login"
          value="Please Login"
          props={{
            redirectTo: '/profile',
            message: 'Login required to access profile'
          }}
        />
      )}
    </div>

);
} 5. With Custom Styling (Tailwind/CSS)
typescriptimport { Path } from './components/Path';

export default function ActionButtons() {
return (

<div class="flex gap-4">
{/_ Primary button _/}
<Path
        to="/create"
        value="Create New"
        rc="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      />

      {/* Secondary button */}
      <Path
        to="/archive"
        value="View Archive"
        rc="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
      />

      {/* Danger button */}
      <Path
        to="/delete"
        value="Delete"
        rc="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
        props={{ confirmRequired: true }}
      />
    </div>

);
} 6. Breadcrumb Navigation
typescriptimport { Path } from './components/Path';

export default function Breadcrumb({ items }) {
return (

<nav class="breadcrumb">
{items.map((item, index) => (
<span key={index}>
{index > 0 && <span class="separator"> / </span>}
<Path
to={item.path}
value={item.label}
props={item.props || {}}
class={index === items.length - 1 ? 'active' : ''}
/>
</span>
))}
</nav>
);
}

// Usage:
// <Breadcrumb items={[
// { label: 'Home', path: '/' },
// { label: 'Products', path: '/products' },
// { label: 'Laptop', path: '/products/123', props: { category: 'electronics' } }
// ]} />
🔄 Comparison: Path vs Direct Router
typescript// ❌ Using router directly (more verbose)
import { router } from '../main';
import { setLinkProps } from '../router/fynix-router';

const handleClick = () => {
setLinkProps('myKey', { title: 'Post', author: 'John' });
};

return (
<a
href="/blog/123"
data-fynix-link
data-props-key="myKey"
onClick={handleClick}

>

    Read More

  </a>
);

// ✅ Using Path component (cleaner)
import { Path } from './components/Path';

return (
<Path
to="/blog/123"
value="Read More"
props={{ title: 'Post', author: 'John' }}
/>
);
🎨 Styling Options
typescript// Using 'class' attribute
<Path to="/about" value="About" class="my-link active" />

// Using 'rc' (reactive class) - Fynix-specific
<Path to="/about" value="About" rc="text-blue-500 hover:underline" />

// Using 'id' attribute
<Path to="/about" value="About" id="about-link" />

// Combine multiple attributes
<Path
  to="/profile"
  value="My Profile"
  class="nav-link"
  id="profile-link"
  rc="font-bold text-lg"
/>
✅ Best Practices

Always use Path for internal navigation - It handles everything automatically
Pass only serializable data in props - No functions or complex objects
Use meaningful prop names - Makes debugging easier
Set target="\_blank" for external links - Better UX
Add rel="noopener noreferrer" for security - When using target="\_blank"

⚠️ Important Notes

The Path component automatically sets data-fynix-link for you
Props are wrapped in nixState automatically for reactivity
External URLs (starting with http:// or https://) will open normally
The router blocks props keys starting with \_\_ for security
<logic>
//script here like 
const count = state(); 
</logic>
<view>
<div r-class="main">Hello</div>
</view>
<style>
</style>
