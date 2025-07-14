# Quick Linting Fix Reference

## 🚀 Getting Started

### Run Automated Fixes
```bash
# Make script executable (if not already done)
chmod +x scripts/fix-linting.sh

# Run automated fixes
./scripts/fix-linting.sh

# Check current status
./scripts/fix-linting.sh --status

# Preview what would be fixed
./scripts/fix-linting.sh --dry-run
```

### Check Progress
```bash
# Run linting to see remaining errors
npm run lint

# Count remaining errors
npm run lint 2>&1 | grep -o "Found [0-9]* errors"
```

## 🔧 Manual Fixes Required

### 1. Button Types (High Priority)
**Error:** `lint/a11y/useButtonType`

**Before:**
```tsx
<button onClick={handleClick}>Click me</button>
```

**After:**
```tsx
<button type="button" onClick={handleClick}>Click me</button>
```

### 2. SVG Accessibility (High Priority)
**Error:** `lint/a11y/noSvgWithoutTitle`

**Before:**
```tsx
<svg viewBox="0 0 24 24">
  <path d="..."/>
</svg>
```

**After:**
```tsx
<svg viewBox="0 0 24 24">
  <title>Descriptive title for screen readers</title>
  <path d="..."/>
</svg>
```

### 3. Keyboard Events (High Priority)
**Error:** `lint/a11y/useKeyWithClickEvents`

**Before:**
```tsx
<div onClick={handleClick}>Clickable div</div>
```

**After:**
```tsx
<div 
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
  tabIndex={0}
  role="button"
>
  Clickable div
</div>
```

### 4. Semantic HTML (Medium Priority)
**Error:** `lint/a11y/useSemanticElements`

**Before:**
```tsx
<div role="contentinfo">Footer content</div>
<div role="dialog">Modal content</div>
<div role="region">Section content</div>
```

**After:**
```tsx
<footer>Footer content</footer>
<dialog>Modal content</dialog>
<section>Section content</section>
```

### 5. Array Keys (Medium Priority)
**Error:** `lint/suspicious/noArrayIndexKey`

**Before:**
```tsx
{items.map((item, index) => (
  <div key={index}>{item.name}</div>
))}
```

**After:**
```tsx
{items.map((item, index) => (
  <div key={`item-${item.id || item.name.toLowerCase().replace(/\s+/g, '-')}`}>
    {item.name}
  </div>
))}
```

### 6. TypeScript Types (Medium Priority)
**Error:** `lint/suspicious/noExplicitAny`

**Before:**
```tsx
const handleClick = (data: any) => {
  // ...
}
```

**After:**
```tsx
interface ClickData {
  id: string;
  value: string;
}

const handleClick = (data: ClickData) => {
  // ...
}
```

## 📁 Priority File Order

### Phase 1: Core Landing Components
1. `src/app/components/landing/Hero.tsx`
2. `src/app/components/landing/Problem.tsx`
3. `src/app/components/landing/Benefits.tsx`
4. `src/app/components/landing/HowItWorks.tsx`

### Phase 2: Supporting Components
5. `src/app/components/landing/Footer.tsx`
6. `src/app/components/landing/Technical.tsx`
7. `src/app/components/landing/Testimonials.tsx`

### Phase 3: Other Pages
8. `src/app/frameworks/page.tsx`
9. `src/app/settings/page.tsx`

## 🧪 Testing After Each Fix

```bash
# 1. Check TypeScript compilation
npx tsc --noEmit

# 2. Test build
npm run build

# 3. Run linting
npm run lint

# 4. Start dev server to test functionality
npm run dev
```

## 🎯 Common Patterns

### Interactive Elements Checklist
- [ ] `type="button"` on all buttons
- [ ] `onKeyDown` handler for click events
- [ ] `tabIndex={0}` for focusable elements
- [ ] `role="button"` for non-button clickable elements
- [ ] `aria-hidden="true"` for decorative icons

### SVG Accessibility Checklist
- [ ] `<title>` element with descriptive text
- [ ] `aria-hidden="true"` for decorative SVGs
- [ ] `role="img"` for informative SVGs

### React Best Practices
- [ ] Stable keys (not array indices)
- [ ] Self-closing empty elements
- [ ] Proper TypeScript types
- [ ] Semantic HTML elements

## 🚨 Quick Commands

```bash
# Find all buttons without type
grep -r "<button[^>]*onClick" src/ --include="*.tsx" | grep -v 'type="'

# Find all SVGs without title
grep -r "<svg[^>]*>" src/ --include="*.tsx" -A 1 | grep -v "<title>"

# Find array index keys
grep -r "key={.*index" src/ --include="*.tsx"

# Find explicit any types
grep -r ": any" src/ --include="*.ts" --include="*.tsx"
```

## 📊 Progress Tracking

| Category | Initial | Current | Target |
|----------|---------|---------|--------|
| Total Errors | 671 | 241 | 0 |
| Accessibility | ~150 | ~120 | 0 |
| Code Quality | ~80 | ~60 | 0 |
| TypeScript | ~20 | ~15 | 0 |
| Formatting | ~15 | ~10 | 0 |

## 🎉 Success Criteria

- [ ] Zero linting errors (`npm run lint` passes)
- [ ] TypeScript compilation succeeds
- [ ] Build process completes
- [ ] All interactive elements are keyboard accessible
- [ ] All images/SVGs have proper accessibility attributes
- [ ] No performance regressions

---

**Need Help?** Check the detailed [LINTING_RESOLUTION_PLAN.md](./LINTING_RESOLUTION_PLAN.md) for comprehensive guidance.