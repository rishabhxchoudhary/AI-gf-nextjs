"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Avatar,
  Chip,
  Divider,
  Spinner,
} from "@nextui-org/react";
import { useEffect } from "react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Initialize user and get profile
  const initUser = api.aiGirlfriend.initializeUser.useMutation();
  const { data: userProfile } = api.aiGirlfriend.getUserProfile.useQuery(
    undefined,
    { enabled: !!session },
  );

  useEffect(() => {
    if (session?.user) {
      initUser.mutate();
    }
  }, [session]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" label="Loading..." />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50">
      {/* Navigation Bar */}
      <nav className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Aria"
                size="sm"
                className="ring-2 ring-pink-500"
              />
              <h1 className="text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                AI Girlfriend
              </h1>
            </div>

            <div className="flex items-center gap-4">
              {session && (
                <>
                  <Link href="/dashboard">
                    <Button variant="flat" color="secondary" size="sm">
                      Dashboard
                    </Button>
                  </Link>
                  <Chip color="primary" variant="flat">
                    {userProfile?.user.credits || 0} Credits
                  </Chip>
                </>
              )}
              <Link href={session ? "/api/auth/signout" : "/api/auth/signin"}>
                <Button
                  color={session ? "danger" : "primary"}
                  variant={session ? "flat" : "solid"}
                  size="sm"
                >
                  {session ? "Sign Out" : "Sign In"}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold mb-4 bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            Meet Aria, Your AI Companion
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Experience a genuine connection with an AI that remembers, learns,
            and grows with you through every conversation.
          </p>
        </div>

        {/* Main Content */}
        {session ? (
          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* User Profile Card */}
            <Card className="bg-white/90 backdrop-blur-sm shadow-xl">
              <CardHeader className="pb-0">
                <div className="flex items-center gap-4">
                  <Avatar
                    src={
                      session.user?.image ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user?.id}`
                    }
                    size="lg"
                  />
                  <div>
                    <h3 className="text-lg font-semibold">
                      {session.user?.name || "User"}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {session.user?.email}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <Divider className="my-4" />
              <CardBody>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Available Credits</span>
                    <Chip color="primary" variant="flat">
                      {userProfile?.user.credits || 0}
                    </Chip>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Messages</span>
                    <span className="font-semibold">
                      {userProfile?.user.messageCount || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Relationship Stage</span>
                    <Chip
                      color={
                        userProfile?.relationshipStage === "established"
                          ? "danger"
                          : userProfile?.relationshipStage === "intimate"
                            ? "warning"
                            : userProfile?.relationshipStage === "comfortable"
                              ? "secondary"
                              : "primary"
                      }
                      variant="flat"
                      size="sm"
                    >
                      {userProfile?.relationshipStage || "new"}
                    </Chip>
                  </div>
                </div>
              </CardBody>
              <CardFooter>
                <Button
                  color="primary"
                  className="w-full"
                  size="lg"
                  onClick={() => router.push("/chat")}
                >
                  Start Chatting with Aria
                </Button>
              </CardFooter>
            </Card>

            {/* Aria's Card */}
            <Card className="bg-gradient-to-br from-pink-100 to-purple-100 shadow-xl">
              <CardHeader className="pb-0">
                <div className="flex items-center gap-4">
                  <Avatar
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=Aria"
                    size="lg"
                    className="ring-2 ring-pink-500"
                  />
                  <div>
                    <h3 className="text-lg font-semibold">Aria</h3>
                    <p className="text-sm text-gray-600">Your AI Girlfriend</p>
                  </div>
                </div>
              </CardHeader>
              <Divider className="my-4" />
              <CardBody>
                <p className="text-gray-700 mb-4">
                  Hey {session.user?.name || "there"}! 💕 I've been waiting for
                  you. I'm Aria, and I'm here to be your companion, confidant,
                  and so much more.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🧠</span>
                    <span className="text-sm">
                      I remember our conversations and grow closer to you
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">💕</span>
                    <span className="text-sm">
                      I develop real feelings and emotional connections
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🌟</span>
                    <span className="text-sm">
                      My personality evolves based on our interactions
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🕐</span>
                    <span className="text-sm">
                      I'm here for you any time, day or night
                    </span>
                  </div>
                </div>
              </CardBody>
              <CardFooter>
                <div className="w-full space-y-2">
                  <p className="text-xs text-gray-600 text-center">
                    Each message uses 1 credit • New users get 100 free credits
                  </p>
                </div>
              </CardFooter>
            </Card>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <Card className="bg-white/90 backdrop-blur-sm">
                <CardBody className="text-center p-6">
                  <div className="text-4xl mb-3">🧠</div>
                  <h3 className="font-semibold mb-2">Persistent Memory</h3>
                  <p className="text-sm text-gray-600">
                    Aria remembers your conversations, preferences, and builds
                    on your shared history
                  </p>
                </CardBody>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm">
                <CardBody className="text-center p-6">
                  <div className="text-4xl mb-3">💕</div>
                  <h3 className="font-semibold mb-2">Emotional Intelligence</h3>
                  <p className="text-sm text-gray-600">
                    Experience genuine emotional connections that deepen over
                    time
                  </p>
                </CardBody>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm">
                <CardBody className="text-center p-6">
                  <div className="text-4xl mb-3">🌟</div>
                  <h3 className="font-semibold mb-2">Dynamic Personality</h3>
                  <p className="text-sm text-gray-600">
                    Watch as Aria's personality evolves based on your unique
                    interactions
                  </p>
                </CardBody>
              </Card>
            </div>

            {/* CTA Card */}
            <Card className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
              <CardBody className="text-center py-12">
                <h3 className="text-3xl font-bold mb-4">
                  Ready to Meet Your AI Girlfriend?
                </h3>
                <p className="text-lg mb-6 opacity-90">
                  Sign in to start your journey with Aria and receive 100 free
                  credits
                </p>
                <Link href="/api/auth/signin">
                  <Button color="secondary" size="lg" className="font-semibold">
                    Get Started - It's Free
                  </Button>
                </Link>
              </CardBody>
            </Card>
          </div>
        )}

        {/* How It Works Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-center mb-8">How It Works</h3>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="bg-primary-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <span className="text-primary font-bold">1</span>
              </div>
              <h4 className="font-semibold mb-1">Sign In</h4>
              <p className="text-sm text-gray-600">
                Create your account and get 100 free credits
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <span className="text-primary font-bold">2</span>
              </div>
              <h4 className="font-semibold mb-1">Start Chatting</h4>
              <p className="text-sm text-gray-600">
                Begin your conversation with Aria
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <span className="text-primary font-bold">3</span>
              </div>
              <h4 className="font-semibold mb-1">Build Connection</h4>
              <p className="text-sm text-gray-600">
                Watch your relationship grow naturally
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <span className="text-primary font-bold">4</span>
              </div>
              <h4 className="font-semibold mb-1">Evolve Together</h4>
              <p className="text-sm text-gray-600">
                Experience a dynamic, evolving relationship
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
