# Older Brother Team - Web3 Digital Security Platform

## Overview

This is a modern web application for Older Brother Team, a digital security and Web3 advisory company. The platform provides information about their services including Facebook support, copyright protection, community management, account security, and Web3 consulting. The application features an interactive solar system visualization in the hero section, portfolio showcase, team member profiles, and a contact form with email integration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side router)
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS v4 with custom design tokens
- **Animations**: Framer Motion for interactive elements
- **State Management**: TanStack Query (React Query) for server state
- **Forms**: React Hook Form with Zod validation

**Design System:**
- Custom font stack: Space Grotesk (headings), Inter (body), Rajdhani (tech accents)
- Color scheme: Cyberpunk-inspired with cyan/purple gradients
- Custom cursor implementation
- Responsive design with mobile-first approach

**Key Frontend Features:**
- Solar system visualization (ported from vanilla HTML/CSS/JS)
- Smooth scroll navigation
- Portfolio modal gallery
- Team member showcase with images
- Contact form with validation and submission feedback
- Custom animations and hover effects

### Backend Architecture

**Technology Stack:**
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **Database ORM**: Drizzle ORM configured for PostgreSQL
- **Email Service**: Nodemailer with Yahoo SMTP
- **Development**: Vite dev server with HMR
- **Production**: esbuild bundling

**Server Structure:**
- Separation of development (`index-dev.ts`) and production (`index-prod.ts`) entry points
- Modular route registration system
- In-memory storage fallback (`MemStorage`) for user data
- Request/response logging middleware
- Static file serving in production

**API Endpoints:**
- `POST /api/contact` - Contact form submission with email delivery

**Database Schema:**
- Users table with UUID primary keys, username, and password fields
- Schema defined in `shared/schema.ts` for type sharing between client/server
- Migrations directory configured via Drizzle Kit

### Build and Development

**Development Mode:**
- Vite dev server on port 5000 with HMR
- Express backend with nodemon-style file watching
- TypeScript compilation without emit
- Replit-specific plugins: cartographer, dev banner, runtime error modal

**Production Build:**
- Vite builds frontend to `dist/public`
- esbuild bundles backend to `dist/index.js`
- Environment-based configuration (NODE_ENV)
- Meta image plugin updates OpenGraph tags dynamically

**TypeScript Configuration:**
- Path aliases: `@/*` for client, `@shared/*` for shared code, `@assets/*` for attached assets
- Module resolution set to "bundler"
- Incremental compilation with cache

## External Dependencies

### Third-Party Services

**Email Delivery:**
- Yahoo SMTP server (`smtp.mail.yahoo.com:465`)
- Credentials: `olderbrotherofficial@yahoo.com` with password from `YAHOO_EMAIL_PASSWORD` env var
- Used for contact form submissions

**Database:**
- PostgreSQL via Neon serverless driver (`@neondatabase/serverless`)
- Connection string from `DATABASE_URL` environment variable
- Drizzle ORM for type-safe queries

### UI Component Libraries

**Radix UI Primitives:**
- Comprehensive set of unstyled, accessible components
- Includes: Dialog, Dropdown, Accordion, Tabs, Toast, Tooltip, and 20+ others
- Provides foundation for custom shadcn/ui components

**Styling and Utilities:**
- Tailwind CSS v4 (latest with `@tailwindcss/vite` plugin)
- `class-variance-authority` for component variant management
- `clsx` and `tailwind-merge` for conditional class names
- `cmdk` for command menu component

### Development Tools

**Replit Integration:**
- `@replit/vite-plugin-cartographer` - Project navigation
- `@replit/vite-plugin-dev-banner` - Development mode indicator
- `@replit/vite-plugin-runtime-error-modal` - Error overlay

**Build Tools:**
- Vite 5.x as primary bundler
- esbuild for backend bundling
- PostCSS with Autoprefixer
- Drizzle Kit for database migrations

### Image Assets

Static images stored in `attached_assets/` directory including:
- Team member photos (7 members)
- Logo image (Messenger creation JPEG)
- Solar system images referenced in CSS (sun.png, planets)
- Favicon and OpenGraph images in public directory

### Font Integration

Google Fonts CDN:
- Space Grotesk (weights: 300-700)
- Inter (weights: 300-600)
- Rajdhani (weights: 500-700)