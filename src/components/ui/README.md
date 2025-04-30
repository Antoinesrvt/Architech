# UI Components

This directory contains reusable UI components for the application. These components follow a consistent design pattern and are built to work with DaisyUI and Tailwind CSS.

## Available Components

### Loading Components

- **Spinner**: A versatile loading spinner component with different sizes and colors.
- **LoadingOverlay**: Overlays content with a loading indicator.
- **Skeleton**: Shows placeholder UI during content loading.
- **CardSkeleton**: Specialized skeleton for card layouts.

### Usage Examples

#### Spinner

```tsx
import { Spinner } from "@/components/ui";

// Basic usage
<Spinner />

// With custom size and color
<Spinner size="lg" color="secondary" />

// With visible label
<Spinner showLabel label="Loading data..." />
```

#### LoadingOverlay

```tsx
import { LoadingOverlay } from "@/components/ui";

// Basic usage
<LoadingOverlay isLoading={isLoading}>
  <YourContent />
</LoadingOverlay>

// With custom properties
<LoadingOverlay 
  isLoading={isLoading}
  loadingText="Please wait..."
  blurAmount="md"
  bgOpacity={50}
  spinnerProps={{ color: "primary", size: "lg" }}
>
  <YourContent />
</LoadingOverlay>
```

#### Skeleton

```tsx
import { Skeleton } from "@/components/ui";

// Basic usage
<Skeleton width="100%" height={200} />

// Text skeleton
<Skeleton text lines={3} />

// Card skeleton
<Skeleton.Card />

// Table skeleton
<Skeleton.Table rows={5} columns={4} />

// Grid skeleton
<Skeleton.Grid items={6} columns={3} />
```

## Documentation

For detailed component props and examples, see the [example page](/examples/loading) in the application. 