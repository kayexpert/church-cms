import { supabase } from './supabase';

/**
 * Check if the required database tables exist
 * @returns Promise<boolean> True if all required tables exist, false otherwise
 */
export async function checkDatabaseSetup(): Promise<boolean> {
  try {
    // List of required tables
    const requiredTables = [
      'church_info',
      'departments',
      'certificates',
      'covenant_families',
      'event_categories',
      'income_categories',
      'expenditure_categories',
      'liability_categories',
      'accounts',
    ];
    
    // Check if each table exists
    for (const table of requiredTables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error && error.code === '42P01') {
        // Table doesn't exist (PostgreSQL error code for undefined_table)
        console.error(`Table ${table} doesn't exist`);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error checking database setup:', error);
    return false;
  }
}

/**
 * Initialize the database with default values if needed
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // Check if church_info exists and has at least one record
    const { data: churchInfo, error: churchInfoError } = await supabase
      .from('church_info')
      .select('*')
      .maybeSingle();
    
    if (churchInfoError && churchInfoError.code !== 'PGRST116') {
      throw churchInfoError;
    }
    
    // If no church info exists, create a default record
    if (!churchInfo) {
      const { error } = await supabase
        .from('church_info')
        .insert({
          name: 'My Church',
          email: 'info@mychurch.org',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      
      if (error) {
        throw error;
      }
    }
    
    // Add default categories if needed
    const tables = [
      { name: 'income_categories', defaults: ['Tithes', 'Offerings', 'Donations'] },
      { name: 'expenditure_categories', defaults: ['Utilities', 'Salaries', 'Maintenance'] },
      { name: 'liability_categories', defaults: ['Loans', 'Bills', 'Taxes'] },
      { name: 'departments', defaults: ['Worship', 'Children', 'Youth'] },
      { name: 'event_categories', defaults: ['Service', 'Meeting', 'Outreach'] },
    ];
    
    for (const table of tables) {
      const { count, error: countError } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        throw countError;
      }
      
      // If no records exist, add defaults
      if (count === 0) {
        const records = table.defaults.map(name => ({
          name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        
        const { error } = await supabase
          .from(table.name)
          .insert(records);
        
        if (error) {
          throw error;
        }
      }
    }
    
    // Add a default account if none exists
    const { count: accountCount, error: accountCountError } = await supabase
      .from('accounts')
      .select('*', { count: 'exact', head: true });
    
    if (accountCountError) {
      throw accountCountError;
    }
    
    if (accountCount === 0) {
      const { error } = await supabase
        .from('accounts')
        .insert({
          name: 'Main Account',
          account_type: 'bank',
          is_default: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      
      if (error) {
        throw error;
      }
    }
    
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}
