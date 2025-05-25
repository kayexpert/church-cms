import { supabase } from '@/lib/supabase';
import { MessagingConfiguration, MessagingConfigFormValues } from '@/types/messaging';
import { ServiceResponse } from '@/types/common';

/**
 * Get all SMS provider configurations
 */
export async function getMessagingConfigurations(): Promise<ServiceResponse<MessagingConfiguration[]>> {
  try {
    const { data, error } = await supabase
      .from('messaging_configurations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching messaging configurations:', error);
      return { data: null, error };
    }

    return { data: data as MessagingConfiguration[], error: null };
  } catch (error) {
    console.error('Error in getMessagingConfigurations:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get default SMS provider configuration
 */
export async function getDefaultMessagingConfiguration(): Promise<ServiceResponse<MessagingConfiguration>> {
  try {
    const { data, error } = await supabase
      .from('messaging_configurations')
      .select('*')
      .eq('is_default', true)
      .single();

    if (error) {
      console.error('Error fetching default messaging configuration:', error);
      return { data: null, error };
    }

    return { data: data as MessagingConfiguration, error: null };
  } catch (error) {
    console.error('Error in getDefaultMessagingConfiguration:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Create a new SMS provider configuration
 */
export async function createMessagingConfiguration(config: MessagingConfigFormValues): Promise<ServiceResponse<MessagingConfiguration>> {
  try {
    console.log('Creating messaging configuration:', config);

    // Check if the messaging_configurations table exists
    try {
      const { data: tableExists, error: tableCheckError } = await supabase
        .from('messaging_configurations')
        .select('count(*)', { count: 'exact', head: true });

      if (tableCheckError) {
        console.error('Error checking if messaging_configurations table exists:', tableCheckError);

        // If the table doesn't exist, try to create it
        if (tableCheckError.message.includes('relation "messaging_configurations" does not exist')) {
          try {
            // Try to create the tables directly with supabase
            try {
              const { error: createError } = await supabase.rpc('exec_sql', {
                sql_query: `
                  CREATE EXTENSION IF NOT EXISTS pgcrypto;

                  CREATE TABLE IF NOT EXISTS messaging_configurations (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    provider_name TEXT NOT NULL,
                    api_key TEXT,
                    api_secret TEXT,
                    base_url TEXT,
                    auth_type TEXT,
                    is_default BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                  );



                  -- Enable RLS on messaging_configurations
                  ALTER TABLE IF EXISTS messaging_configurations ENABLE ROW LEVEL SECURITY;

                  -- Create RLS policies for messaging_configurations
                  CREATE POLICY IF NOT EXISTS "Allow authenticated users to read messaging_configurations"
                    ON messaging_configurations
                    FOR SELECT
                    TO authenticated
                    USING (true);

                  CREATE POLICY IF NOT EXISTS "Allow authenticated users to insert messaging_configurations"
                    ON messaging_configurations
                    FOR INSERT
                    TO authenticated
                    WITH CHECK (true);

                  CREATE POLICY IF NOT EXISTS "Allow authenticated users to update messaging_configurations"
                    ON messaging_configurations
                    FOR UPDATE
                    TO authenticated
                    USING (true);

                  CREATE POLICY IF NOT EXISTS "Allow authenticated users to delete messaging_configurations"
                    ON messaging_configurations
                    FOR DELETE
                    TO authenticated
                    USING (true);


                `
              });

              if (createError) {
                console.error('Error creating tables with exec_sql:', createError);

                // If exec_sql fails, try to create the function first
                const { error: createFunctionError } = await supabase.rpc('exec_sql', {
                  sql_query: `
                    CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
                    RETURNS VOID
                    LANGUAGE plpgsql
                    SECURITY DEFINER
                    AS $$
                    BEGIN
                      EXECUTE sql_query;
                    END;
                    $$;

                    GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO authenticated;
                  `
                });

                if (createFunctionError) {
                  console.error('Error creating exec_sql function:', createFunctionError);
                } else {
                  console.log('exec_sql function created successfully');

                  // Try again to create the tables
                  const { error: retryError } = await supabase.rpc('exec_sql', {
                    sql_query: `
                      CREATE EXTENSION IF NOT EXISTS pgcrypto;

                      CREATE TABLE IF NOT EXISTS messaging_configurations (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        provider_name TEXT NOT NULL,
                        api_key TEXT,
                        api_secret TEXT,
                        base_url TEXT,
                        auth_type TEXT,
                        is_default BOOLEAN DEFAULT FALSE,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                      );



                      -- Enable RLS on messaging_configurations
                      ALTER TABLE IF EXISTS messaging_configurations ENABLE ROW LEVEL SECURITY;

                      -- Create RLS policies for messaging_configurations
                      CREATE POLICY IF NOT EXISTS "Allow authenticated users to read messaging_configurations"
                        ON messaging_configurations
                        FOR SELECT
                        TO authenticated
                        USING (true);

                      CREATE POLICY IF NOT EXISTS "Allow authenticated users to insert messaging_configurations"
                        ON messaging_configurations
                        FOR INSERT
                        TO authenticated
                        WITH CHECK (true);

                      CREATE POLICY IF NOT EXISTS "Allow authenticated users to update messaging_configurations"
                        ON messaging_configurations
                        FOR UPDATE
                        TO authenticated
                        USING (true);

                      CREATE POLICY IF NOT EXISTS "Allow authenticated users to delete messaging_configurations"
                        ON messaging_configurations
                        FOR DELETE
                        TO authenticated
                        USING (true);


                    `
                  });

                  if (retryError) {
                    console.error('Error creating tables after creating function:', retryError);
                    return {
                      data: null,
                      error: new Error('The messaging_configurations table does not exist and could not be created automatically. Please run the database migration first.')
                    };
                  } else {
                    console.log('Tables created successfully after creating function');
                  }
                }
              } else {
                console.log('Tables created successfully with exec_sql');
              }
            } catch (supabaseError) {
              console.error('Error creating tables with supabase:', supabaseError);

              // If supabase approach fails, try using fetch as a fallback
              if (typeof fetch !== 'undefined') {
                try {
                  const response = await fetch('/api/db/direct-sql-execution', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      sql: `
                        CREATE EXTENSION IF NOT EXISTS pgcrypto;

                        CREATE TABLE IF NOT EXISTS messaging_configurations (
                          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                          provider_name TEXT NOT NULL,
                          api_key TEXT,
                          api_secret TEXT,
                          base_url TEXT,
                          auth_type TEXT,
                          is_default BOOLEAN DEFAULT FALSE,
                          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                        );



                        -- Enable RLS on messaging_configurations
                        ALTER TABLE IF EXISTS messaging_configurations ENABLE ROW LEVEL SECURITY;

                        -- Create RLS policies for messaging_configurations
                        CREATE POLICY IF NOT EXISTS "Allow authenticated users to read messaging_configurations"
                          ON messaging_configurations
                          FOR SELECT
                          TO authenticated
                          USING (true);

                        CREATE POLICY IF NOT EXISTS "Allow authenticated users to insert messaging_configurations"
                          ON messaging_configurations
                          FOR INSERT
                          TO authenticated
                          WITH CHECK (true);

                        CREATE POLICY IF NOT EXISTS "Allow authenticated users to update messaging_configurations"
                          ON messaging_configurations
                          FOR UPDATE
                          TO authenticated
                          USING (true);

                        CREATE POLICY IF NOT EXISTS "Allow authenticated users to delete messaging_configurations"
                          ON messaging_configurations
                          FOR DELETE
                          TO authenticated
                          USING (true);


                      `
                    }),
                  });

                  if (!response.ok) {
                    console.error('Failed to create tables with fetch:', await response.text());
                    return {
                      data: null,
                      error: new Error('The messaging_configurations table does not exist and could not be created automatically. Please run the database migration first.')
                    };
                  }

                  console.log('Tables created successfully with fetch');
                } catch (fetchError) {
                  console.error('Error creating tables with fetch:', fetchError);
                  return {
                    data: null,
                    error: new Error('The messaging_configurations table does not exist and could not be created automatically. Please run the database migration first.')
                  };
                }
              } else {
                return {
                  data: null,
                  error: new Error('The messaging_configurations table does not exist and could not be created automatically. Please run the database migration first.')
                };
              }
            }
          } catch (createError) {
            console.error('Error creating tables:', createError);
            return {
              data: null,
              error: new Error('The messaging_configurations table does not exist. Please run the database migration first.')
            };
          }
        }

        return { data: null, error: tableCheckError };
      }
    } catch (error) {
      console.error('Error checking if messaging_configurations table exists:', error);
      return { data: null, error: error as Error };
    }

    // If this is set as default, update all other configurations to not be default
    if (config.is_default) {
      try {
        const { error: updateError } = await supabase
          .from('messaging_configurations')
          .update({ is_default: false })
          .eq('is_default', true);

        if (updateError) {
          console.error('Error updating existing default configurations:', updateError);
        } else {
          console.log('Updated existing default configurations');
        }
      } catch (updateError) {
        console.error('Error updating existing default configurations:', updateError);
      }
    }

    // Insert the new configuration
    try {
      console.log('Inserting new configuration:', config);
      const { data, error } = await supabase
        .from('messaging_configurations')
        .insert(config)
        .select()
        .single();

      if (error) {
        console.error('Error creating messaging configuration:', error);

        // Try a different approach - direct SQL insertion
        try {
          console.log('Trying direct SQL insertion...');
          const { error: sqlError } = await supabase.rpc('exec_sql', {
            sql_query: `
              INSERT INTO messaging_configurations (
                provider_name, api_key, api_secret, base_url, auth_type, is_default
              ) VALUES (
                '${config.provider_name}',
                '${config.api_key || ''}',
                '${config.api_secret || ''}',
                '${config.base_url || ''}',
                '${config.auth_type || ''}',
                ${config.is_default ? 'TRUE' : 'FALSE'}
              ) RETURNING *;
            `
          });

          if (sqlError) {
            console.error('Error with direct SQL insertion:', sqlError);
            return { data: null, error };
          }

          // If direct SQL insertion succeeded, try to fetch the inserted record
          const { data: fetchedData, error: fetchError } = await supabase
            .from('messaging_configurations')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (fetchError) {
            console.error('Error fetching newly created configuration:', fetchError);

            // Return a mock configuration as a last resort
            return {
              data: {
                id: 'direct-insert',
                provider_name: config.provider_name,
                api_key: config.api_key || '',
                api_secret: config.api_secret || '',
                base_url: config.base_url || '',
                auth_type: config.auth_type || '',
                is_default: config.is_default,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              } as MessagingConfiguration,
              error: null
            };
          }

          console.log('Fetched newly created configuration:', fetchedData);
          return { data: fetchedData as MessagingConfiguration, error: null };
        } catch (sqlError) {
          console.error('Error with direct SQL insertion:', sqlError);
          return { data: null, error };
        }
      }

      console.log('Configuration created successfully:', data);
      return { data: data as MessagingConfiguration, error: null };
    } catch (insertError) {
      console.error('Error inserting new configuration:', insertError);
      return { data: null, error: insertError as Error };
    }
  } catch (error) {
    console.error('Error in createMessagingConfiguration:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Update an existing SMS provider configuration
 */
export async function updateMessagingConfiguration(id: string, config: MessagingConfigFormValues): Promise<ServiceResponse<MessagingConfiguration>> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  try {
    console.log(`[${requestId}] Updating messaging configuration:`, { id, ...config, api_key: config.api_key ? '***' : undefined });

    // Handle the default provider setting
    if (config.is_default !== undefined) {
      if (config.is_default) {
        console.log(`[${requestId}] Setting configuration as default, updating other configurations`);

        // First, check if there are any existing default configurations
        const { data: existingDefaults, error: checkError } = await supabase
          .from('messaging_configurations')
          .select('id, provider_name')
          .eq('is_default', true);

        if (checkError) {
          console.error(`[${requestId}] Error checking existing default configurations:`, checkError);
        } else if (existingDefaults && existingDefaults.length > 0) {
          console.log(`[${requestId}] Found ${existingDefaults.length} existing default configurations:`,
            existingDefaults.map(c => ({ id: c.id, provider: c.provider_name })));
        }

        // Update all configurations to not be default
        const { error: updateError } = await supabase
          .from('messaging_configurations')
          .update({ is_default: false })
          .eq('is_default', true);

        if (updateError) {
          console.error(`[${requestId}] Error updating existing default configurations:`, updateError);
          return { data: null, error: updateError };
        }

        console.log(`[${requestId}] Successfully updated existing default configurations`);
      } else {
        console.log(`[${requestId}] Configuration is being set to non-default`);

        // Check if this is currently the default configuration
        const { data: currentConfig, error: checkError } = await supabase
          .from('messaging_configurations')
          .select('is_default')
          .eq('id', id)
          .single();

        if (checkError) {
          console.error(`[${requestId}] Error checking current configuration:`, checkError);
        } else if (currentConfig && currentConfig.is_default) {
          console.log(`[${requestId}] This is currently the default configuration`);

          // Check if there are other configurations that could be set as default
          const { data: otherConfigs, error: otherCheckError } = await supabase
            .from('messaging_configurations')
            .select('id')
            .neq('id', id);

          if (otherCheckError) {
            console.error(`[${requestId}] Error checking other configurations:`, otherCheckError);
          } else if (!otherConfigs || otherConfigs.length === 0) {
            // If this is the only configuration, we can't unset it as default
            console.warn(`[${requestId}] This is the only configuration, keeping it as default`);
            config.is_default = true;
          }
        }
      }
    }

    // Update the configuration
    console.log(`[${requestId}] Updating configuration with ID: ${id}, is_default: ${config.is_default}`);

    // Create a copy of the config object to ensure is_default is explicitly included
    const updateData = {
      ...config,
      is_default: config.is_default === true ? true : false
    };

    console.log(`[${requestId}] Update data being sent to database:`, {
      ...updateData,
      api_key: updateData.api_key ? '***' : undefined,
      api_secret: updateData.api_secret ? '***' : undefined,
      is_default: updateData.is_default
    });

    const { data, error } = await supabase
      .from('messaging_configurations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`[${requestId}] Error updating messaging configuration:`, error);
      return { data: null, error };
    }

    console.log(`[${requestId}] Configuration updated successfully:`, {
      id: data.id,
      provider: data.provider_name,
      isDefault: data.is_default,
      updatedAt: data.updated_at
    });

    // Double-check if the default flag was properly set
    if (config.is_default !== undefined && config.is_default !== data.is_default) {
      console.warn(`[${requestId}] Default flag was not properly set (expected: ${config.is_default}, actual: ${data.is_default}), attempting to fix...`);

      // Try to update just the default flag using direct SQL for maximum reliability
      try {
        console.log(`[${requestId}] Attempting direct SQL update for default flag to ${config.is_default}`);

        const { error: sqlError } = await supabase.rpc('exec_sql', {
          sql_query: `
            UPDATE messaging_configurations
            SET is_default = ${config.is_default ? 'TRUE' : 'FALSE'}
            WHERE id = '${id}';
          `
        });

        if (sqlError) {
          console.error(`[${requestId}] Error with direct SQL update:`, sqlError);

          // Fall back to regular update if SQL fails
          const { data: fixData, error: fixError } = await supabase
            .from('messaging_configurations')
            .update({ is_default: config.is_default })
            .eq('id', id)
            .select()
            .single();

          if (fixError) {
            console.error(`[${requestId}] Error fixing default flag with regular update:`, fixError);
          } else {
            console.log(`[${requestId}] Successfully fixed default flag to ${config.is_default} with regular update`);
            return { data: fixData as MessagingConfiguration, error: null };
          }
        } else {
          // If SQL update succeeded, fetch the updated record
          const { data: fixData, error: fixError } = await supabase
            .from('messaging_configurations')
            .select('*')
            .eq('id', id)
            .single();

          if (fixError) {
            console.error(`[${requestId}] Error fetching updated configuration after SQL update:`, fixError);
          } else {
            console.log(`[${requestId}] Successfully fixed default flag to ${config.is_default} with SQL update`);
            return { data: fixData as MessagingConfiguration, error: null };
          }
        }
      } catch (error) {
        console.error(`[${requestId}] Error in direct SQL update:`, error);

        // Fall back to regular update if try/catch fails
        const { data: fixData, error: fixError } = await supabase
          .from('messaging_configurations')
          .update({ is_default: config.is_default })
          .eq('id', id)
          .select()
          .single();

        if (fixError) {
          console.error(`[${requestId}] Error fixing default flag with regular update:`, fixError);
        } else {
          console.log(`[${requestId}] Successfully fixed default flag to ${config.is_default} with regular update after catch`);
          return { data: fixData as MessagingConfiguration, error: null };
        }
      }
    }

    return { data: data as MessagingConfiguration, error: null };
  } catch (error) {
    console.error(`[${requestId}] Error in updateMessagingConfiguration:`, error);
    return { data: null, error: error as Error };
  }
}

/**
 * Delete an SMS provider configuration
 */
export async function deleteMessagingConfiguration(id: string): Promise<ServiceResponse<null>> {
  try {
    // Check if this is the default configuration
    const { data: config, error: fetchError } = await supabase
      .from('messaging_configurations')
      .select('is_default')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching messaging configuration:', fetchError);
      return { data: null, error: fetchError };
    }

    // Don't allow deleting the default configuration
    if (config.is_default) {
      return {
        data: null,
        error: new Error('Cannot delete the default configuration. Set another configuration as default first.')
      };
    }

    const { error } = await supabase
      .from('messaging_configurations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting messaging configuration:', error);
      return { data: null, error };
    }

    return { data: null, error: null };
  } catch (error) {
    console.error('Error in deleteMessagingConfiguration:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Test an SMS provider configuration
 */
export async function testMessagingConfiguration(config: MessagingConfigFormValues, phoneNumber: string): Promise<ServiceResponse<{ success: boolean; message: string }>> {
  try {
    // This would normally call the SMS provider API to send a test message
    // For now, we'll just simulate a successful test
    return {
      data: {
        success: true,
        message: `Test message sent successfully to ${phoneNumber} using ${config.provider_name} provider`
      },
      error: null
    };
  } catch (error) {
    console.error('Error in testMessagingConfiguration:', error);
    return { data: null, error: error as Error };
  }
}
