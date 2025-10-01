# KPI Dashboard - Sales Performance Tracker

A modern, high-performance dashboard for tracking setter performance with comprehensive KPI analytics.

## 🚀 Features

### Multi-Tab Dashboard
- **Main Dashboard (`/`)**: Real-time KPI overview with interactive filters and charts
- **Weekly Summary (`/weekly`)**: Week-over-week comparisons and daily breakdowns  
- **Daily Summary (`/daily`)**: Daily goals tracking and individual performance
- **Rep Report (`/rep-report`)**: Detailed individual analytics with export functionality
- **Settings (`/settings`)**: Goal configuration and team management

### Advanced Analytics
- **8 Key KPI Cards**: Dials, pickups, conversations, DQs, appointments, deals, performance score, show rate
- **Interactive Charts**: Line trends, bar comparisons, conversion funnel, activity heatmap
- **Performance Leaderboard**: Sortable rankings with tier indicators
- **Goal Tracking**: Progress bars and achievement indicators

### Powerful Filtering
- **Date Range Picker**: Presets (Today, This Week, This Month, Last 30 Days) + custom ranges
- **Setter Multi-Select**: Filter by individual or multiple setters
- **Metric Toggles**: Show/hide specific KPIs with visual controls

### Professional UI/UX
- **Dark/Light Mode**: System preference detection with manual toggle
- **Responsive Design**: Mobile-first approach with proper breakpoints  
- **Loading States**: Skeleton loaders and smooth transitions
- **Error Boundaries**: Graceful error handling with recovery options
- **Performance Optimized**: React Query caching, memoization, virtual scrolling

## 🛠 Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript with comprehensive type safety
- **Styling**: Tailwind CSS with Shadcn UI components
- **Database**: Supabase with Row Level Security
- **Charts**: Recharts with custom responsive components
- **State Management**: React Query for server state, React hooks for client state
- **Theme**: next-themes for dark/light mode
- **Forms**: React Hook Form with Zod validation
- **Date Handling**: date-fns for robust date operations

## 📊 Database Schema

The application connects to a Supabase table `setter_kpi_submissions` with the following fields:

```sql
- submission_date (date)
- contact_id (string)  
- first_name, last_name, full_name (string)
- dials_today, pickups_today, one_min_convos (integer)
- dqs_today, follow_ups_today (integer)
- qualified_appointments, discovery_calls_scheduled (integer)
- prospects_showed_up, prospects_rescheduled (integer)  
- live_calls_today, offers_made, deals_closed (integer)
- deposits_collected, cash_collected (integer)
- focus_score, performance_score (float)
- hours_of_sleep (integer)
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd mktninjas-kpi-tracker
npm install
```

2. **Environment Setup:**
```bash
# Add your Supabase credentials to .env.local
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

3. **Database Setup:**
- Create a Supabase project
- Create the `setter_kpi_submissions` table with the schema above
- Configure Row Level Security (RLS) policies as needed
- Update the Supabase URL in `src/lib/supabase.ts`

4. **Run the development server:**
```bash
npm run dev
```

5. **Open your browser:**
Navigate to [http://localhost:3000](http://localhost:3000)

### Building for Production

```bash
npm run build
npm start
```

## 📱 Pages Overview

### Dashboard (`/`)
- Real-time KPI cards with trend indicators
- Interactive line, bar, funnel, and heatmap charts
- Sortable performance leaderboard
- Comprehensive filtering system

### Weekly Summary (`/weekly`)
- Week navigation with comparison cards
- Daily breakdown chart and table  
- Best performing day highlights
- Team achievement tracking

### Daily Summary (`/daily`)  
- Date picker with goal progress tracking
- Individual setter performance cards
- Team average comparisons
- Daily observations and notes

### Rep Report (`/rep-report`)
- Individual setter analytics with time period selection
- Performance trend charts and consistency scoring
- Detailed daily breakdown table
- CSV export functionality

### Settings (`/settings`)
- Goal configuration for all KPIs
- Team management with setter profiles
- Dashboard preferences and notifications
- Data import/export tools

## 🎨 Design System

### Colors
- **Primary**: Blue gradient (#3B82F6 to #2563EB)
- **Success**: Green (#10B981)  
- **Warning**: Amber (#F59E0B)
- **Danger**: Red (#EF4444)
- **Performance Tiers**: Green (70-100%), Yellow (40-70%), Red (0-40%)

### Components
- **Glassmorphism** effects for modern card designs
- **Framer Motion** animations for smooth interactions  
- **Consistent spacing** and typography throughout
- **Accessibility** compliant with proper ARIA labels

## ⚡ Performance Features

- **React Query**: Intelligent caching with 5-minute stale time
- **Memoization**: Expensive calculations cached with useMemo
- **Virtual Scrolling**: Large tables rendered efficiently
- **Lazy Loading**: Charts and components loaded on demand
- **Debounced Inputs**: Filter changes optimized
- **Code Splitting**: Route-based bundle optimization

## 🔒 Security

- **Supabase RLS**: Row-level security policies
- **Type Safety**: Comprehensive TypeScript coverage
- **Input Validation**: Zod schemas for all forms
- **Error Boundaries**: Graceful failure handling
- **Sanitization**: XSS protection on user inputs

Built with ❤️ using Next.js, TypeScript, and Supabase
