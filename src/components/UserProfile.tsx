"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth"; 

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

const UserProfile = () => {
  const { user } = useAuth(); // misalnya user dari context/auth
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/profiles/${user?.id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error("Failed to load profile");
      }

      const data: Profile = await res.json();
      setProfile(data);
    } catch (error: any) {
      toast({
        title: "Error loading profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const makeAdmin = async () => {
    if (!profile) return;

    try {
      const res = await fetch(`/api/profiles/${user?.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: "admin" }),
      });

      if (!res.ok) {
        throw new Error("Failed to update role");
      }

      await fetchProfile();
      toast({
        title: "Role updated",
        description: "You now have admin privileges",
      });
    } catch (error: any) {
      toast({
        title: "Error updating role",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="p-4">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="p-4">No profile found</div>;
  }

  return (
    <div className="p-6 max-w-md mx-auto bg-card rounded-lg border">
      <h2 className="text-xl font-semibold mb-4">User Profile</h2>
      <div className="space-y-2">
        <p>
          <strong>Email:</strong> {profile.email}
        </p>
        <p>
          <strong>Name:</strong> {profile.full_name || "Not set"}
        </p>
        <p>
          <strong>Role:</strong>{" "}
          <span
            className={
              profile.role === "admin" ? "text-green-600 font-semibold" : ""
            }
          >
            {profile.role}
          </span>
        </p>
        <p>
          <strong>Member since:</strong>{" "}
          {new Date(profile.created_at).toLocaleDateString()}
        </p>
      </div>

      {profile.role !== "admin" && (
        <div className="mt-4">
          <Button onClick={makeAdmin} variant="outline" size="sm">
            Make Admin (for testing)
          </Button>
        </div>
      )}
    </div>
  );
};

export default UserProfile;


