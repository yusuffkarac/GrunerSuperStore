Here is the **English translation**:

---

# ✅ AI Code Writing Standards
Firstly and most  important: Everything that users will see must be GERMAN LANGUAGE but use Turkish language when you respond me!

## 📁 Project Structure

```
project-root/
├── frontend/
│   ├── public/
│   │   ├── manifest.json
│   │   └── index.html
│   ├── src/
│   │   ├── components/      # UI components
│   │   │   ├── common/      # shared UI (Button, Input, Card)
│   │   │   ├── layout/      # Header, Footer, Navbar
│   │   │   └── features/    # domain components
│   │   ├── pages/           # page components
│   │   ├── services/        # API
│   │   ├── store/           # global state
│   │   ├── utils/
│   │   ├── hooks/
│   │   ├── constants/
│   │   ├── styles/
│   │   └── App.jsx
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
/Users/yusuf/Documents/GitHub/GrunerSuperStore/claude.md
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── config/
│   │   └── server.js
│   └── package.json
└── README.md
```

✅ **The right file must be in the right folder.**

---

## 💻 Coding Rules

### ✅ Naming

* camelCase → variables & functions
* PascalCase → components
* UPPER_SNAKE_CASE → constants

### ✅ Component Structure

Order must be:

> import → component → propTypes → export

### ✅ Comments

* Comments written in Turkish
* If logic is unclear → comment required

---

## 🎨 TAILWIND

✅ Mobile-first
✅ Repeated classes → @apply
❌ inline style FORBIDDEN

---

## 🔌 API

### ✅ RESTful

```
GET    /api/product
GET    /api/product/:id
POST   /api/product
PUT    /api/product/:id
DELETE /api/product/:id
```

### ✅ Response Format

```
success: true/false
data: {}
message: "..."
```

---

## 🗄️ Database

* Plural table names: `orders`
* snake_case
* Each model must have:

  * validation
  * index
  * timestamps

---

## 🔐 Security

✅ .env usage
✅ input validation
✅ parameterized queries
✅ auth middleware
✅ passwords/tokens never stored in plaintext

---

## ⚡ Performance

✅ Lazy loading
✅ Image optimization
✅ Debounced search
✅ Virtual scrolling (500+ items)

---

## 🧪 Testing

* Critical functions must be tested
* Auth / order workflow is priority

---

## 🚨 Error Handling

✅ Backend → global error handler
✅ Frontend → error boundary
✅ Show meaningful message to user

---

# ✅ Newly Added Sections

---

## 🧾 Git Rules

### Branch names

```
feat/product-list
fix/cart-bug
refactor/api-layer
```

### Commit format

```
feat: added product list
fix: fixed cart update issue
refactor: simplified service layer
```

### Pull Request

* Short & clear description
* No unnecessary changes
* Tests must pass

---

## 🧩 Logging & Monitoring

* No debug logs in production
* Standard levels:

```
info
warn
error
```

* Sentry or similar recommended long-term

---

## 🚦 Rate Limiting / Throttle

Prevent API spam
→ express-rate-limit

---

## 🚀 Deployment Rules

* env should be separated:

```
development
staging
production
```

* static build served
* versioning

---

## 🧠 Cache

* Redis recommended
* Cache lists & frequently accessed data

---

## 🎭 UX Rules

* Loading state
* Error state
* Empty state
* Skeleton UI

---

## ♿ A11y

* Proper contrast
* Alt text
* Tab navigation
* ARIA labels

---

# ✅ Checklist

✅ Responsive
✅ Loading
✅ Error handling
✅ Validation
✅ Try/catch
✅ Comments
✅ Performance
✅ A11y

---

# 🚫 NEVER

❌ inline style
❌ console.log (prod)
❌ hardcoded data
❌ magic number
❌ Turkish variable names
❌ direct API call inside component
❌ log sensitive data
❌ commit .env

---

This is V2 version:
✅ Shorter
✅ Clearer
✅ More professional
✅ No repetition
✅ Scalable
✅ Added modern topics

---


# 📱 MOBILE-APP FEEL GUIDELINES

When building a web application, follow the rules below to ensure the interface feels like a native mobile application:

---

## ✅ Mobile-Focused General Rules

1. Design must be **mobile-first**
2. Main content width should be centered with **max 480–600px**
3. Default fonts should be system fonts
4. All UI elements must be touch-friendly (min 24px)

```css
.container {
  max-width: 480px;
  margin: 0 auto;
}
```

---

## ✅ PWA Requirements

1. Project must include **manifest.json**
2. `display: "standalone"` must be used
3. Critical assets & pages must be cached via **service worker**
4. Support **Add to Home Screen**

> But do NOT add icons to manifest.json unless the user specifically requests!

---

## ✅ Navigation Rules

1. A **bottom navigation bar** should be used
2. Navigation items should contain icon + short label
3. Colors should be clean & high contrast
4. Active tab should be clearly highlighted

---

## ✅ Page Transitions & Animation

1. Use **smooth transitions** between pages
2. Modals & drawers should behave like **bottom sheets**
3. Prefer `Framer Motion` or similar animation libraries

→ Suggested transitions: slide-right, fade, slide-up

---

## ✅ Bottom Sheet Usage

Bottom sheet modals should be used for:

* Cart preview
* Product details
* Address selection

→ This strongly reinforces the native feel

---

## ✅ Gesture Support

1. Swipe-to-delete recommended (e.g., remove item from cart)
2. Carousels should scroll horizontally
3. Lists should scroll smoothly

→ Recommended libs: `react-swipeable`, `framer-motion`

---

## ✅ Online / Offline Behavior

1. Show message when offline
2. Product list should be cached
3. Cart should be stored in local storage

---

## ✅ UI/UX Rules

1. Use skeleton UI

2. Loading states must be visible

3. Empty states must explain meaning

4. Back navigation must feel intuitive:

   * ESC → back
   * Header back button visible

5. Touch areas must be large (min 24px)

---

## ✅ Page Structure

1. Simple top header
2. Page content
3. Bottom nav at bottom

→ Basic structure: navigation + product list + cart + profile

---

## ✅ Fonts & Colors

1. Use system fonts:

```
-apple-system, BlinkMacSystemFont, Roboto, sans-serif
```

2. Minimal color palette
3. Font sizes optimized for mobile

---

## ✅ Performance

1. Use lazy loading
2. Images should be responsive & lazy loaded
3. Avoid unnecessary JS loading

---

# ✅ Short Summary (TL;DR)

| Required | Feature            |
| -------- | ------------------ |
| ✅        | PWA manifest + SW  |
| ✅        | 480px width limit  |
| ✅        | Bottom Navigation  |
| ✅        | Bottom Sheet       |
| ✅        | Smooth transitions |
| ✅        | Offline cache      |
| ✅        | Touch-first UI     |
| ✅        | Skeleton screens   |

---

✅ **Done.**
