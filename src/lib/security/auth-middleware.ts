
// Security middleware for admin routes
import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function checkAdminAuth(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // In production, implement proper admin role checking
    // For now, we'll use a simple email check
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
    if (!adminEmails.includes(user.email || '')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    return null; // No error, user is authenticated admin
  } catch (error) {
    return NextResponse.json({ error: 'Authentication error' }, { status: 500 });
  }
}

export function sanitizeError(error: any) {
  if (process.env.NODE_ENV === 'production') {
    console.error('Production error:', error);
    return { error: 'Internal server error' };
  }
  return { error: error instanceof Error ? error.message : String(error) };
}
