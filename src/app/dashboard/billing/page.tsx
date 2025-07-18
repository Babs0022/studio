
"use client";

import { useState, useEffect } from "react";
import { Check, CreditCard, Sparkles, LoaderCircle } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserSubscription } from "@/types/subscription";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const planDetails = {
    monthly: {
        name: "Pro Plan (Monthly)",
        planId: "pro",
        billingCycle: "monthly" as const,
        priceString: "$20",
        priceSuffix: "/ month",
        features: [
            "Billed month-to-month",
            "Unlimited Written Content Generation",
            "Unlimited Prompt Generation",
            "Unlimited Web Page/App Generation",
            "Unlimited Image Generation",
            "Unlimited Structured Data Generation",
            "Access to All Future Tools",
            "Priority Support",
        ],
    },
    annually: {
        name: "Pro Plan (Annually)",
        planId: "pro",
        billingCycle: "annually" as const,
        priceString: "$216",
        priceSuffix: "/ year",
        features: [
            "Based on a $20/month value",
            "Billed annually with a 10% discount",
            "Unlimited Written Content Generation",
            "Unlimited Prompt Generation",
            "Unlimited Web Page/App Generation",
            "Unlimited Image Generation",
            "Unlimited Structured Data Generation",
            "Access to All Future Tools",
            "Priority Support",
        ],
    },
};

const CurrentPlanCard = ({ subscription }: { subscription: UserSubscription }) => (
    <Card className="border-primary bg-primary/5">
        <CardHeader>
            <CardTitle>Your Current Plan</CardTitle>
            <CardDescription>You have full access to all features.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-2">
                <p className="font-semibold text-xl">
                    BrieflyAI Pro <Badge variant="outline" className="ml-2 align-middle capitalize">{subscription.billingCycle}</Badge>
                </p>
                {subscription.currentPeriodEnd && (
                    <p className="text-muted-foreground">
                        Your subscription will renew on {format(subscription.currentPeriodEnd, 'PPP')}.
                    </p>
                )}
            </div>
        </CardContent>
        <CardFooter>
             <p className="text-xs text-muted-foreground">To manage your subscription, please contact support.</p>
        </CardFooter>
    </Card>
);


export default function BillingPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [subscription, setSubscription] = useState<UserSubscription | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('annually');

    const selectedPlan = planDetails[billingCycle];

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        
        const subDocRef = doc(db, "userSubscriptions", user.uid);
        const unsubscribe = onSnapshot(subDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setSubscription({
                    ...data,
                    currentPeriodEnd: data.currentPeriodEnd?.toDate(),
                    startedAt: data.startedAt?.toDate(),
                    currentPeriodStart: data.currentPeriodStart?.toDate(),
                } as UserSubscription);
            } else {
                setSubscription(null);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const handleUpgrade = async () => {
        if (!user) {
            toast({
                variant: "destructive",
                title: "Authentication Error",
                description: "You must be signed in to upgrade your plan.",
            });
            return;
        }
        
        setIsProcessing(true);

        try {
            const functions = getFunctions();
            const initializePayment = httpsCallable(functions, 'initializePaystackPayment');
            const result = await initializePayment({ 
                planId: selectedPlan.planId, 
                billingCycle: selectedPlan.billingCycle 
            });
            
            const { authorization_url } = result.data as { authorization_url: string };

            if (authorization_url) {
                window.location.href = authorization_url;
            } else {
                throw new Error("Could not retrieve payment URL.");
            }

        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Payment Error",
                description: error.message || "An unexpected error occurred. Please try again.",
            });
            setIsProcessing(false);
        }
    }
    
    if (isLoading) {
        return (
            <DashboardLayout>
                <main className="flex-1 p-4 md:p-8">
                     <div className="max-w-md mx-auto">
                        <Skeleton className="h-[500px] w-full" />
                    </div>
                </main>
            </DashboardLayout>
        );
    }
    
    if (subscription && subscription.status === 'active') {
         return (
             <DashboardLayout>
                <main className="flex-1 p-4 md:p-8">
                    <div className="max-w-md mx-auto">
                        <CurrentPlanCard subscription={subscription} />
                    </div>
                </main>
            </DashboardLayout>
         )
    }

    return (
        <DashboardLayout>
            <main className="flex-1 p-4 md:p-8">
                <div className="max-w-md mx-auto">
                     <Card className="w-full text-center shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="mx-auto w-fit rounded-full bg-primary/10 p-4 mb-4">
                                <Sparkles className="h-10 w-10 text-primary" />
                            </div>
                            <CardTitle className="text-3xl">BrieflyAI Pro</CardTitle>
                            <CardDescription className="text-lg text-muted-foreground">
                                Unlock all features and supercharge your creativity.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <div className="flex items-center justify-center gap-4">
                                <Label htmlFor="billing-cycle" className={billingCycle === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}>Monthly</Label>
                                <Switch 
                                    id="billing-cycle"
                                    checked={billingCycle === 'annually'}
                                    onCheckedChange={(checked) => setBillingCycle(checked ? 'annually' : 'monthly')}
                                />
                                <Label htmlFor="billing-cycle" className={billingCycle === 'annually' ? 'text-foreground' : 'text-muted-foreground'}>
                                    Annually <Badge variant="secondary" className="ml-1 align-middle">Save 10%</Badge>
                                </Label>
                            </div>

                            <p className="text-5xl font-bold">
                                {selectedPlan.priceString}
                                <span className="text-lg font-normal text-muted-foreground">{selectedPlan.priceSuffix}</span>
                            </p>
                            <ul className="space-y-3 text-left">
                                {selectedPlan.features.map(feature => (
                                    <li key={feature} className="flex items-center gap-3">
                                        <Check className="h-5 w-5 text-primary" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="relative">
                                <Button size="lg" className="w-full text-lg" disabled={true}>
                                    <CreditCard className="mr-2 h-5 w-5" />
                                    Upgrade to Pro
                                </Button>
                                <Badge variant="secondary" className="absolute -top-2 -right-3">Coming Soon</Badge>
                            </div>
                        </CardContent>
                         <CardFooter>
                            <p className="text-xs text-muted-foreground mx-auto">
                                Payments are securely processed. You can cancel anytime.
                            </p>
                         </CardFooter>
                    </Card>
                </div>
            </main>
        </DashboardLayout>
    );
}
