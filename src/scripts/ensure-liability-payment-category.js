#!/usr/bin/env node

/**
 * Script to ensure the "Liability Payment" system category exists in the database
 * This script can be run to fix the liability payment category assignment issue
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function ensureLiabilityPaymentCategory() {
  try {
    console.log('🔍 Checking for "Liability Payment" category...');

    // Check if the category already exists
    const { data: existingCategory, error: checkError } = await supabase
      .from('expenditure_categories')
      .select('id, name, description')
      .eq('name', 'Liability Payment')
      .maybeSingle();

    if (checkError) {
      console.error('❌ Error checking for existing category:', checkError);
      throw checkError;
    }

    if (existingCategory) {
      console.log('✅ "Liability Payment" category already exists:');
      console.log(`   ID: ${existingCategory.id}`);
      console.log(`   Name: ${existingCategory.name}`);
      console.log(`   Description: ${existingCategory.description}`);
      return existingCategory.id;
    }

    console.log('📝 Creating "Liability Payment" category...');

    // Create the category
    const { data: newCategory, error: createError } = await supabase
      .from('expenditure_categories')
      .insert({
        name: 'Liability Payment',
        description: 'System category for liability payments',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating category:', createError);
      throw createError;
    }

    console.log('✅ Successfully created "Liability Payment" category:');
    console.log(`   ID: ${newCategory.id}`);
    console.log(`   Name: ${newCategory.name}`);
    console.log(`   Description: ${newCategory.description}`);

    return newCategory.id;
  } catch (error) {
    console.error('❌ Failed to ensure Liability Payment category:', error);
    throw error;
  }
}

async function updateExistingLiabilityPayments(categoryId) {
  try {
    console.log('🔍 Checking for existing liability payment entries without proper category...');

    // Find expenditure entries that are liability payments but don't have the correct category
    const { data: liabilityPayments, error: fetchError } = await supabase
      .from('expenditure_entries')
      .select('id, category_id, description, amount, liability_payment, liability_id')
      .eq('liability_payment', true)
      .neq('category_id', categoryId);

    if (fetchError) {
      console.error('❌ Error fetching liability payment entries:', fetchError);
      throw fetchError;
    }

    if (!liabilityPayments || liabilityPayments.length === 0) {
      console.log('✅ All liability payment entries already have the correct category');
      return;
    }

    console.log(`📝 Found ${liabilityPayments.length} liability payment entries to update...`);

    // Update the entries to use the correct category
    const { data: updatedEntries, error: updateError } = await supabase
      .from('expenditure_entries')
      .update({ 
        category_id: categoryId,
        updated_at: new Date().toISOString()
      })
      .eq('liability_payment', true)
      .neq('category_id', categoryId)
      .select('id');

    if (updateError) {
      console.error('❌ Error updating liability payment entries:', updateError);
      throw updateError;
    }

    console.log(`✅ Successfully updated ${updatedEntries?.length || 0} liability payment entries`);
  } catch (error) {
    console.error('❌ Failed to update existing liability payments:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting Liability Payment Category Maintenance...\n');

    // Ensure the category exists
    const categoryId = await ensureLiabilityPaymentCategory();

    console.log('');

    // Update existing liability payment entries
    await updateExistingLiabilityPayments(categoryId);

    console.log('\n✅ Liability Payment Category Maintenance completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - "Liability Payment" system category is now available');
    console.log('   - All liability payment entries use the correct category');
    console.log('   - Future liability payments will automatically use this category');

  } catch (error) {
    console.error('\n❌ Liability Payment Category Maintenance failed:', error);
    process.exit(1);
  }
}

// Run the script
main();
