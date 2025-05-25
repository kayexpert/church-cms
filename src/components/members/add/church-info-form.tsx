"use client";

import { Users, Loader2 } from "lucide-react";
import { Control } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "../shared/multi-select";

export interface Department {
  id: string;
  name: string;
}

export interface Certificate {
  id: string;
  name: string;
}

export interface CovenantFamily {
  id: string;
  name: string;
}

export interface ChurchInfoFormProps {
  control: Control<any>;
  departments: Department[];
  certificates: Certificate[];
  covenantFamilies: CovenantFamily[];
  isLoadingData: {
    departments: boolean;
    certificates: boolean;
    covenantFamilies: boolean;
  };
}

export function ChurchInfoForm({
  control,
  departments,
  certificates,
  covenantFamilies,
  isLoadingData
}: ChurchInfoFormProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-muted w-10 h-10 rounded-full flex items-center justify-center">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <h3 className="text-xl font-medium">Church Information</h3>
      </div>

      <div className="space-y-5">
        <FormField
          control={control}
          name="covenantFamily"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Covenant Family</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select covenant family" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {isLoadingData.covenantFamilies ? (
                    <div className="flex items-center justify-center p-2">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm">Loading...</span>
                    </div>
                  ) : (
                    covenantFamilies.map((family) => (
                      <SelectItem key={family.id} value={family.id}>
                        {family.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="departments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Departments</FormLabel>
              <FormControl>
                <div className="w-full">
                  {isLoadingData.departments ? (
                    <div className="flex items-center justify-center h-9 border rounded-md">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm text-muted-foreground">Loading departments...</span>
                    </div>
                  ) : (
                    <MultiSelect
                      options={departments}
                      selected={field.value}
                      onChange={field.onChange}
                      placeholder="Select departments"
                    />
                  )}
                </div>
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="certificates"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Certificates</FormLabel>
              <FormControl>
                <div className="w-full">
                  {isLoadingData.certificates ? (
                    <div className="flex items-center justify-center h-9 border rounded-md">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm text-muted-foreground">Loading certificates...</span>
                    </div>
                  ) : (
                    <MultiSelect
                      options={certificates}
                      selected={field.value}
                      onChange={field.onChange}
                      placeholder="Select certificates"
                    />
                  )}
                </div>
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Additional information about the member"
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
