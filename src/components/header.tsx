"use client";

import { Menu } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { useMediaQuery } from "@/hooks/use-media-query";
import { MessagingNotification } from "@/components/messaging/messaging-notification";

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
}

export function Header({ title, onMenuClick }: HeaderProps) {
  const router = useRouter();
  const { signOut, user } = useAuth();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userInitials, setUserInitials] = useState<string>("U");
  const isMobile = useMediaQuery("(max-width: 640px)");

  // Function to get abbreviated title for mobile
  const getDisplayTitle = () => {
    if (!isMobile) return title;

    // Special case for "Asset Management"
    if (title === "Asset Management") {
      return "Assets Mgt.";
    }

    // For other titles, you could add more abbreviations here
    return title;
  };

  // Fetch user profile data including profile image
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;

      try {
        // First check if the profiles table exists
        const { error: tableCheckError } = await supabase
          .from("profiles")
          .select("id")
          .limit(1);

        // If the table doesn't exist, handle gracefully
        if (tableCheckError && tableCheckError.code === "42P01") { // PostgreSQL error code for undefined_table
          console.warn("Profiles table doesn't exist yet. Using default avatar.");

          // Set default initials from email
          if (user.email) {
            setUserInitials(user.email.substring(0, 2).toUpperCase());
          }
          return;
        }

        // Check if profile_image column exists using a safer approach
        // Try to select the profile_image column from a dummy query
        const { error: columnCheckError } = await supabase
          .from('profiles')
          .select('profile_image')
          .limit(1);

        // If there's an error and it mentions the column doesn't exist, then it doesn't exist
        const hasProfileImageColumn = !columnCheckError ||
          !columnCheckError.message.includes('column "profile_image" does not exist');

        // Try to get the user's profile with or without profile_image
        const { data, error } = await supabase
          .from("profiles")
          .select(hasProfileImageColumn
            ? "first_name, last_name, profile_image"
            : "first_name, last_name")
          .eq("id", user.id)
          .single();

        if (error) {
          // PGRST116 is "Results contain 0 rows" - this is normal for new users
          if (error.code !== "PGRST116") {
            console.error("Error fetching user profile:", error);
          }

          // Set default initials from email
          if (user.email) {
            setUserInitials(user.email.substring(0, 2).toUpperCase());
          }
          return;
        }

        if (data) {
          // Set profile image if available
          if (data.profile_image) {
            setProfileImage(data.profile_image);
          }

          // Set user initials for avatar fallback
          let initials = "U";
          if (data.first_name && data.last_name) {
            initials = `${data.first_name.charAt(0)}${data.last_name.charAt(0)}`;
          } else if (data.first_name) {
            initials = data.first_name.charAt(0);
          } else if (user.email) {
            initials = user.email.substring(0, 2).toUpperCase();
          }

          setUserInitials(initials);
        }
      } catch (error) {
        console.error("Error in fetchUserProfile:", error);
      }
    };

    fetchUserProfile();
  }, [user]);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 border-b bg-card shadow-sm">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
        <h1 className="text-xl font-semibold">{getDisplayTitle()}</h1>
      </div>
      <div className="flex items-center gap-6">
        <MessagingNotification />
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full p-0.5 hover:bg-primary/10 transition-all duration-200 hover:shadow-md group"
            >
              <Avatar className="h-11 w-11 border-2 border-primary/30 ring-2 ring-primary/10 transition-all duration-300 group-hover:border-primary/50 group-hover:ring-primary/20">
                <AvatarImage src={profileImage || ""} alt={user?.email || "User"} />
                <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10 text-primary font-medium text-lg">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-auto min-w-[14rem] p-2 rounded-xl shadow-lg">
            <div className="flex items-center gap-3 p-2 mb-1">
              <Avatar className="h-10 w-10 border border-primary/20">
                <AvatarImage src={profileImage || ""} alt={user?.email || "User"} />
                <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10 text-primary font-medium">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-medium">{user?.email?.split('@')[0] || "User"}</span>
                <span className="text-xs text-muted-foreground">{user?.email || "user@example.com"}</span>
              </div>
            </div>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem asChild className="flex items-center gap-2 py-2 cursor-pointer">
              <a
                href="/settings?tab=general&section=profile"
                className="flex items-center gap-2 w-full no-hover"
                onClick={(e) => {
                  e.preventDefault();
                  router.push('/settings?tab=general&section=profile');
                }}
              >
                <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary"></span>
                </span>
                Profile
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="flex items-center gap-2 py-2 cursor-pointer">
              <a
                href="/settings"
                className="flex items-center gap-2 w-full no-hover"
                onClick={(e) => {
                  e.preventDefault();
                  router.push('/settings');
                }}
              >
                <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary"></span>
                </span>
                Settings
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              onClick={async () => {
                try {
                  const loadingToast = toast.loading("Signing out...");
                  await signOut();
                  toast.dismiss(loadingToast);
                  toast.success("Signed out successfully");
                } catch (error) {
                  console.error("Error signing out:", error);
                  toast.error("Failed to sign out. Please try again.");
                }
              }}
              className="flex items-center gap-2 py-2 cursor-pointer text-destructive hover:text-destructive"
            >
              <span className="h-5 w-5 rounded-full bg-destructive/10 flex items-center justify-center">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive"></span>
              </span>
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
