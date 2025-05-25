"use client";

import { Users, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MultiSelect } from "../shared/multi-select";
import { formatDate } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export interface MemberChurchInfoProps {
  member: {
    departments?: string[];
    certificates?: string[];
    covenantFamily?: string;
  };
  departmentsList: Department[];
  certificatesList: Certificate[];
  covenantFamiliesList: CovenantFamily[];
  isEditing: boolean;
  isLoading: {
    departments: boolean;
    certificates: boolean;
    covenantFamilies: boolean;
  };
  onDepartmentsChange: (values: string[]) => void;
  onCertificatesChange: (values: string[]) => void;
  onCovenantFamilyChange: (value: string) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function MemberChurchInfo({
  member,
  departmentsList,
  certificatesList,
  covenantFamiliesList,
  isEditing,
  isLoading,
  onDepartmentsChange,
  onCertificatesChange,
  onCovenantFamilyChange,
  onInputChange
}: MemberChurchInfoProps) {

  // Find the covenant family name based on the ID
  const covenantFamily = member.covenantFamily
    ? covenantFamiliesList.find(cf => cf.id === member.covenantFamily)
    : null;

  const covenantFamilyName = member.covenantFamily
    ? (covenantFamily?.name || 'Unknown Family')
    : 'N/A';

  return (
    <div className="bg-muted border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Church Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-muted-foreground" />
          <div className="flex flex-col">
            <p className="text-sm text-muted-foreground">Departments</p>
            {isEditing ? (
              <div className="mt-1">
                {isLoading.departments ? (
                  <div className="flex items-center justify-center h-9 border rounded-md bg-muted/30">
                    <div className="animate-spin h-4 w-4 border-2 border-primary rounded-full border-t-transparent"></div>
                    <span className="ml-2 text-sm text-muted-foreground">Loading departments...</span>
                  </div>
                ) : (
                  <MultiSelect
                    options={departmentsList}
                    selected={member.departments || []}
                    onChange={onDepartmentsChange}
                    placeholder="Select departments"
                  />
                )}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1 mt-1">
                {isLoading.departments ? (
                  <div className="animate-pulse flex gap-1">
                    <div className="h-6 w-16 bg-muted rounded-full"></div>
                    <div className="h-6 w-20 bg-muted rounded-full"></div>
                    <div className="h-6 w-14 bg-muted rounded-full"></div>
                  </div>
                ) : (
                  <>
                    {Array.isArray(member.departments) && member.departments.length > 0 ? (
                      <>
                        {member.departments.map((dept, index) => {
                          // Find the department name based on the ID
                          const department = departmentsList.find(d => d.id === dept);
                          const deptName = department?.name || 'Unknown Department';
                          return (
                            <Badge
                              key={index}
                              variant="outline"
                              className={`${department ? 'bg-primary/10 text-primary border-primary/20' : 'bg-yellow-100 text-yellow-800 border-yellow-200'}`}
                            >
                              {deptName}
                            </Badge>
                          );
                        })}
                      </>
                    ) : (
                      <span className="font-medium">N/A</span>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-muted-foreground" />
          <div className="flex flex-col">
            <p className="text-sm text-muted-foreground">Covenant Family</p>
            {isEditing ? (
              <Select
                value={member.covenantFamily || undefined}
                onValueChange={onCovenantFamilyChange}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="Select covenant family" />
                </SelectTrigger>
                <SelectContent>
                  {isLoading.covenantFamilies ? (
                    <div className="flex items-center justify-center p-2">
                      <div className="animate-spin h-4 w-4 border-2 border-primary rounded-full border-t-transparent mr-2"></div>
                      <span className="text-sm">Loading...</span>
                    </div>
                  ) : (
                    covenantFamiliesList.map((family) => (
                      <SelectItem key={family.id} value={family.id}>
                        {family.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            ) : (
              isLoading.covenantFamilies ? (
                <div className="animate-pulse mt-1">
                  <div className="h-6 w-32 bg-muted rounded"></div>
                </div>
              ) : (
                <p className={`font-medium ${!covenantFamily && member.covenantFamily ? "text-yellow-600" : ""}`}>{covenantFamilyName}</p>
              )
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Award className="h-5 w-5 text-muted-foreground" />
          <div className="flex flex-col">
            <p className="text-sm text-muted-foreground">Certificates</p>
            {isEditing ? (
              <div className="mt-1">
                {isLoading.certificates ? (
                  <div className="flex items-center justify-center h-9 border rounded-md bg-muted/30">
                    <div className="animate-spin h-4 w-4 border-2 border-primary rounded-full border-t-transparent"></div>
                    <span className="ml-2 text-sm text-muted-foreground">Loading certificates...</span>
                  </div>
                ) : (
                  <MultiSelect
                    options={certificatesList}
                    selected={member.certificates || []}
                    onChange={onCertificatesChange}
                    placeholder="Select certificates"
                  />
                )}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1 mt-1">
                {isLoading.certificates ? (
                  <div className="animate-pulse flex gap-1">
                    <div className="h-6 w-24 bg-muted rounded-full"></div>
                    <div className="h-6 w-16 bg-muted rounded-full"></div>
                  </div>
                ) : (
                  <>
                    {Array.isArray(member.certificates) && member.certificates.length > 0 ? (
                      <>
                        {member.certificates.map((cert, index) => {
                          // Find the certificate name based on the ID
                          const certificate = certificatesList.find(c => c.id === cert);
                          const certName = certificate?.name || 'Unknown Certificate';
                          return (
                            <Badge
                              key={index}
                              variant="outline"
                              className={`${certificate ? 'bg-primary/10 text-primary border-primary/20' : 'bg-yellow-100 text-yellow-800 border-yellow-200'}`}
                            >
                              {certName}
                            </Badge>
                          );
                        })}
                      </>
                    ) : (
                      <span className="font-medium">N/A</span>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>


      </div>
    </div>
  );
}
