# Church Management System

A comprehensive church management system built with Next.js 15 and Supabase.

## Features

- **Authentication**: Secure login and registration system
- **Dashboard**: Overview of key metrics and activities
- **Members Management**: Track and manage church members
- **Finance Management**: Track income, expenditure, and liabilities
- **Events Management**: Schedule and manage church events
- **Reports Generation**: Generate various reports
- **Settings Management**: Configure system settings

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Supabase (PostgreSQL, Authentication, Storage)
- **State Management**: Zustand, React Query
- **Form Handling**: React Hook Form, Zod
- **Data Visualization**: Recharts

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `src/app`: Next.js app router pages
- `src/components`: Reusable UI components
- `src/lib`: Utility functions and libraries
- `src/types`: TypeScript type definitions
- `src/services`: Service functions for data fetching and manipulation
- `src/hooks`: Custom React hooks
- `src/store`: Global state management with Zustand
- `src/providers`: React context providers
- `src/db`: Database functions and SQL scripts

## Performance Optimizations

This project includes several performance optimizations:

### Database Optimizations

- **SQL Functions**: Custom SQL functions in `src/db/functions` move computation to the database server
- **Function Detection**: Automatic detection of available SQL functions with graceful fallbacks
- **Caching**: Efficient caching of database query results with React Query

### Image Optimizations

- **Next.js Image Component**: Optimized image loading with proper sizing and formats
- **Client-side Optimization**: Images are resized and compressed before upload
- **Format Detection**: Automatic detection of best supported image formats (WebP/JPEG)
- **Lazy Loading**: Images are lazy-loaded for better performance

### React Optimizations

- **React Server Components**: Leveraging Next.js 15 RSC for better performance
- **Memoization**: Proper use of useMemo and useCallback for expensive operations
- **Query Optimization**: Efficient data fetching with React Query
- **Type Safety**: Comprehensive TypeScript types for better developer experience

## Database Schema

The application uses the following database tables:
- `members`: Church members information
- `departments`: Church departments
- `member_departments`: Junction table for members and departments
- `certificates`: Certificates issued by the church
- `member_certificates`: Junction table for members and certificates
- `covenant_families`: Covenant families in the church
- `income_categories`: Categories for income
- `income_entries`: Income transactions
- `expenditure_categories`: Categories for expenditure
- `expenditure_entries`: Expenditure transactions
- `liability_categories`: Categories for liabilities
- `liabilities`: Church liabilities
- `events`: Church events
- `event_categories`: Categories for events
- `attendance`: Attendance records
- `attendance_records`: Individual attendance records

## Learn More

To learn more about the technologies used in this project:

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.io/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Shadcn UI Documentation](https://ui.shadcn.com)

## License

This project is licensed under the MIT License.
