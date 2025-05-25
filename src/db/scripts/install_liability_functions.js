/**
 * Script to install the make_liability_payment database function
 * 
 * This script:
 * 1. Reads the make_liability_payment.sql file
 * 2. Executes the SQL to create the function in the database
 * 3. Verifies that the function was created successfully
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Supabase URL or service key not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function installLiabilityFunctions() {
  try {
    console.log('Starting installation of liability functions...');

    // Read the SQL file
    const functionFilePath = path.join(__dirname, '../functions/make_liability_payment.sql');
    const functionSql = fs.readFileSync(functionFilePath, 'utf8');

    console.log('Read make_liability_payment.sql file successfully');
    console.log('Installing function...');

    // Execute the SQL to create the function
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: functionSql
    });

    if (error) {
      console.error('Error executing SQL:', error);
      
      // Try direct query if RPC fails
      console.log('Trying direct query...');
      const { error: directError } = await supabase.from('_exec_sql').insert({
        query: functionSql
      });
      
      if (directError) {
        console.error('Error with direct query:', directError);
        throw directError;
      }
    }

    console.log('Function installed successfully');

    // Verify that the function was created
    console.log('Verifying function installation...');
    
    const { data: verifyData, error: verifyError } = await supabase.rpc('exec_sql', {
      sql_query: "SELECT routine_name, routine_type FROM information_schema.routines WHERE routine_name = 'make_liability_payment' AND routine_type = 'FUNCTION';"
    });

    if (verifyError) {
      console.error('Error verifying function installation:', verifyError);
      throw verifyError;
    }

    if (verifyData && verifyData.length > 0) {
      console.log('Function verified successfully:', verifyData);
    } else {
      console.warn('Function may not have been installed correctly. Please check the database.');
    }

    console.log('Installation completed successfully');
  } catch (error) {
    console.error('Error installing liability functions:', error);
    process.exit(1);
  }
}

// Run the installation
installLiabilityFunctions();
