import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { setToken } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Container, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const loginMutation = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(
      { data: { username, password } },
      {
        onSuccess: (data) => {
          setToken(data.token);
          queryClient.setQueryData(getGetMeQueryKey(), data.user);
          setLocation("/dashboard");
        },
        onError: (error: any) => {
          toast({
            title: "Login Failed",
            description: error?.data?.error || "Invalid username or password",
            variant: "destructive",
          });
        }
      }
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-50 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1586528116311-ad8ed7c80a30?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />
      
      <div className="z-10 w-full max-w-md p-6">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="h-16 w-16 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-primary/20">
            <Container className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">FAAS Terminal</h1>
          <p className="text-zinc-400">Freight Audit Automation System</p>
        </div>

        <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-zinc-100">Authenticate</CardTitle>
            <CardDescription className="text-zinc-400">Enter your credentials to access the audit cockpit.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-zinc-300">Username</Label>
                <Input 
                  id="username" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-primary"
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-300">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-primary"
                  required 
                />
              </div>
              <Button type="submit" className="w-full font-semibold" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Initialize Session
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
