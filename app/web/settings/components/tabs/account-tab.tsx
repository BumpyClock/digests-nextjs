import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";

export const AccountTab = memo(function AccountTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Settings</CardTitle>
        <CardDescription>Manage your account and subscription</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-1.5">
          <Label htmlFor="email">Email Address</Label>
          <Input id="email" value="user@example.com" readOnly />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="name">Display Name</Label>
          <Input id="name" placeholder="Your Name" />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Change Password</Button>
        <Button>Save Changes</Button>
      </CardFooter>
    </Card>
  );
});
