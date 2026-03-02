# How to Connect Components and Styles in Your Frontend

## ✅ Setup Complete

I've configured your project to properly connect components and styles. Here's what was done:

### 1. Created Utility Functions
- **File**: `src/lib/utils.ts`
- Contains the `cn()` function for merging Tailwind classes
- Required by all UI components in `components/ui/`

### 2. Configured Path Aliases
- **File**: `vite.config.js`
- Added `@/` alias pointing to `./src`
- Now you can import from `@/lib/utils` instead of relative paths

### 3. Connected Global Styles
- **File**: `src/main.jsx`
- Imported `styles/globals.css` which contains your Tailwind theme variables

### 4. Installed Required Dependencies
- `clsx` - for conditional class names
- `tailwind-merge` - for merging Tailwind classes
- `class-variance-authority` - for component variants
- `@radix-ui/react-slot` - for component composition

## 📦 How to Use Components

### Importing Components from `components/ui/`

```jsx
// Example: Using Button component
import { Button } from '../../components/ui/button';

function MyComponent() {
  return (
    <div>
      <Button variant="default" size="lg">
        Click Me
      </Button>
      <Button variant="outline" size="sm">
        Secondary
      </Button>
    </div>
  );
}
```

### Importing Components from Root `components/` Directory

```jsx
// Example: Using a dashboard component
import AdminDashboard from '../../components/dashboards/admin-dashboard';

function AdminPage() {
  return <AdminDashboard />;
}
```

### Using Components with TypeScript

If your component is in TypeScript (`.tsx`), you can import it in JavaScript files (`.jsx`) without issues:

```jsx
// In a .jsx file
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
```

## 🎨 Using Styles

### Global Styles
Global styles from `styles/globals.css` are automatically loaded. They include:
- Tailwind CSS configuration
- CSS custom properties (variables)
- Dark mode support
- Theme colors

### Component-Specific Styles
You can create component-specific CSS files:

```jsx
// MyComponent.jsx
import './MyComponent.css';

function MyComponent() {
  return <div className="my-component">Content</div>;
}
```

### Using Tailwind Classes
All Tailwind utility classes are available:

```jsx
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">
  <h1 className="text-2xl font-bold text-gray-900">Title</h1>
</div>
```

## 📝 Example: Complete Component Usage

Here's a complete example showing how to use multiple components:

```jsx
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';

function ExamplePage() {
  return (
    <div className="container mx-auto p-4">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Example Form</h2>
        <div className="space-y-4">
          <Input 
            type="text" 
            placeholder="Enter your name"
            className="w-full"
          />
          <div className="flex gap-2">
            <Button variant="default">Submit</Button>
            <Button variant="outline">Cancel</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default ExamplePage;
```

## 🔧 Troubleshooting

### If imports don't work:
1. Make sure the path alias is correct (check `vite.config.js`)
2. Restart your dev server: `npm run dev`
3. Check that the component file exists

### If styles don't apply:
1. Make sure `styles/globals.css` is imported in `src/main.jsx`
2. Check that Tailwind is configured in `vite.config.js`
3. Verify your Tailwind classes are valid

### If TypeScript errors occur:
- Make sure `@types/react` is installed (already in devDependencies)
- Check that your component exports are correct

## 📁 Project Structure

```
FE/
├── components/          # Root-level components (dashboards, admin, etc.)
│   ├── ui/             # Reusable UI components (Button, Card, etc.)
│   ├── admin/
│   ├── dashboards/
│   └── ...
├── src/
│   ├── lib/
│   │   └── utils.ts    # Utility functions (cn, etc.)
│   ├── components/     # App-specific components
│   ├── pages/          # Page components
│   └── main.jsx        # Entry point (imports globals.css)
└── styles/
    └── globals.css     # Global Tailwind styles
```

## 🚀 Next Steps

1. Import your components in your pages/routes
2. Use Tailwind classes for styling
3. Customize the theme in `styles/globals.css` if needed
4. Add new components to `components/ui/` as needed
