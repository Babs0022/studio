
"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LoaderCircle } from "lucide-react";
import Logo from "@/components/shared/Logo";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
});

export default function ForgotPasswordForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, values.email);
      setIsSuccess(true);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  if (isSuccess) {
    return (
        <div className="space-y-6 text-center">
            <div className="flex justify-center">
                <Logo />
            </div>
            <h1 className="text-2xl font-bold pt-4">Check Your Email</h1>
            <p className="text-muted-foreground">
                We've sent a password reset link to your email address.
            </p>
            <Button asChild className="w-full">
                <Link href="/login">Back to Login</Link>
            </Button>
        </div>
    )
  }

  return (
    <div className="space-y-6">
       <div className="space-y-2 text-center">
        <div className="flex justify-center">
            <Logo />
        </div>
        <h1 className="text-2xl font-bold pt-4">Forgot Password</h1>
        <p className="text-muted-foreground">
          No worries, we'll send you reset instructions.
        </p>
      </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                Send Reset Link
            </Button>
          </form>
        </Form>
        <div className="text-center text-sm text-muted-foreground w-full">
          Remember your password?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </div>
    </div>
  );
}
