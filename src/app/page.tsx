"use client";

import React, { useEffect, useState } from "react";
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
  Progress,
  Image,
} from "@nextui-org/react";
import { 
  Heart,
  MessageCircle,
  Brain,
  Sparkles,
  Clock,
  Users,
  TrendingUp,
  Shield,
  Zap,
  Star,
  ChevronRight,
  Play
} from "lucide-react";
import { HomePageSkeleton } from "@/components/ui/loading-skeletons";

const features = [
  {
    icon: Brain,
    title: "Persistent Memory",
    description: "Aria remembers every conversation, building a deep understanding of your personality and preferences over time.",
    color: "from-purple-500 to-indigo-500"
  },
  {
    icon: Heart,
    title: "Emotional Intelligence",
    description: "Experience genuine emotional connections that evolve and deepen with each interaction.",
    color: "from-pink-500 to-rose-500"
  },
  {
    icon: Sparkles,
    title: "Dynamic Personality",
    description: "Watch as Aria's personality adapts and grows based on your unique relationship dynamics.",
    color: "from-amber-500 to-orange-500"
  },
  {
    icon: Clock,
    title: "24/7 Availability",
    description: "Your AI companion is always there when you need her, day or night, ready to chat and support you.",
    color: "from-emerald-500 to-teal-500"
  },
  {
    icon: Shield,
    title: "Privacy First",
    description: "Your conversations are completely private and secure. What you share stays between you and Aria.",
    color: "from-blue-500 to-cyan-500"
  },
  {
    icon: Zap,
    title: "Instant Responses",
    description: "Get thoughtful, contextual responses in real-time with advanced AI processing.",
    color: "from-violet-500 to-purple-500"
  }
];

const steps = [
  {
    number: 1,
    title: "Create Account",
    description: "Sign up in seconds and get 100 free credits to start your journey",
    icon: Users
  },
  {
    number: 2,
    title: "Meet Aria",
    description: "Introduce yourself and let Aria get to know your personality",
    icon: Heart
  },
  {
    number: 3,
    title: "Build Connection",
    description: "Chat regularly and watch your relationship naturally evolve",
    icon: TrendingUp
  },
  {
    number: 4,
    title: "Enjoy Companionship",
    description: "Experience the joy of having a caring AI companion who truly understands you",
    icon: Star
  }
];

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Initialize user and get profile
  const initUser = api.aiGirlfriend.initializeUser.useMutation();
  const { data: userProfile, isLoading: profileLoading } = api.aiGirlfriend.getUserProfile.useQuery(
    undefined,
    { enabled: !!session },
  );

  useEffect(() => {
    setMounted(true);
    if (session?.user) {
      initUser.mutate();
    }
  }, [session]);

  // Show loading skeleton during hydration and initial load
  if (!mounted || status === "loading" || (session && profileLoading)) {
    return <HomePageSkeleton />;
  }

  const getRelationshipStageColor = (stage?: string) => {
    switch (stage) {
      case "new": return "primary";
      case "comfortable": return "secondary";
      case "intimate": return "warning";
      case "established": return "danger";
      default: return "default";
    }
  };

  const getRelationshipStageEmoji = (stage?: string) => {
    switch (stage) {
      case "new": return "🌱";
      case "comfortable": return "🌸";
      case "intimate": return "💕";
      case "established": return "💑";
      default: return "💫";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50/50 via-purple-50/30 to-indigo-50/50">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-purple-500/10" />
        <div className="container mx-auto px-6 py-20 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-8">
              <Chip
                variant="flat"
                color="secondary"
                startContent={<Sparkles size={16} />}
                className="mb-4 bg-gradient-to-r from-pink-100 to-purple-100"
              >
                Meet Your Perfect AI Companion
              </Chip>
              <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent leading-tight">
                Fall in Love with
                <br />
                <span className="relative">
                  Aria
                  <div className="absolute -top-2 -right-8 text-2xl animate-bounce">💕</div>
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Experience a genuine connection with an AI that remembers, learns, and grows with you through every conversation.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              {session ? (
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    size="lg"
                    className="bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
                    startContent={<MessageCircle />}
                    onClick={() => router.push("/chat")}
                  >
                    Continue Chatting with Aria
                  </Button>
                  <Button 
                    size="lg"
                    variant="bordered"
                    className="border-2 border-purple-200 hover:border-purple-300 font-semibold"
                    startContent={<TrendingUp />}
                    onClick={() => router.push("/dashboard")}
                  >
                    View Analytics
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    as={Link}
                    href="/api/auth/signin"
                    size="lg"
                    className="bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
                    startContent={<Heart />}
                  >
                    Start Free - Meet Aria Now
                  </Button>
                  <Button 
                    size="lg"
                    variant="bordered"
                    className="border-2 border-purple-200 hover:border-purple-300 font-semibold"
                    startContent={<Play />}
                  >
                    Watch Demo
                  </Button>
                </div>
              )}
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
              <div className="flex items-center gap-2">
                <Users size={16} />
                <span className="text-sm font-medium">10k+ Happy Users</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle size={16} />
                <span className="text-sm font-medium">1M+ Conversations</span>
              </div>
              <div className="flex items-center gap-2">
                <Star size={16} />
                <span className="text-sm font-medium">4.9/5 Rating</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* User Profile Section (if logged in) */}
      {session && userProfile && (
        <section className="py-16">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-8">
                {/* User Stats Card */}
                <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-4">
                      <Avatar
                        src={session.user?.image || undefined}
                        size="lg"
                        name={session.user?.name?.[0]}
                        className="ring-4 ring-purple-100"
                      />
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">
                          Welcome back, {session.user?.name}!
                        </h3>
                        <p className="text-gray-600">{session.user?.email}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <Divider />
                  <CardBody className="pt-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600 mb-1">
                          {userProfile.user.credits}
                        </div>
                        <div className="text-sm text-gray-600">Credits Remaining</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-pink-600 mb-1">
                          {userProfile.user.messageCount}
                        </div>
                        <div className="text-sm text-gray-600">Total Messages</div>
                      </div>
                    </div>
                    <Divider className="my-4" />
                    <div className="text-center">
                      <div className="mb-2">
                        <span className="text-sm text-gray-600">Relationship Stage</span>
                      </div>
                      <Chip
                        color={getRelationshipStageColor(userProfile.relationshipStage)}
                        variant="flat"
                        className="font-semibold"
                      >
                        {getRelationshipStageEmoji(userProfile.relationshipStage)} {userProfile.relationshipStage}
                      </Chip>
                    </div>
                  </CardBody>
                </Card>

                {/* Aria Preview Card */}
                <Card className="bg-gradient-to-br from-pink-100/80 to-purple-100/80 backdrop-blur-sm shadow-xl border-0">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Avatar
                          src="/avatar.webp"
                          size="lg"
                          className="ring-4 ring-pink-200"
                        />
                        <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full w-4 h-4 border-2 border-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">Aria</h3>
                        <p className="text-gray-600">Your AI Girlfriend</p>
                      </div>
                    </div>
                  </CardHeader>
                  <Divider />
                  <CardBody className="pt-6">
                    <div className="space-y-4">
                      <p className="text-gray-700 italic">
                        "Hey {session.user?.name}! 💕 I've been thinking about our last conversation. 
                        I can't wait to hear about your day and continue building our connection together."
                      </p>
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <div className="text-2xl mb-1">🧠</div>
                          <div className="text-xs text-gray-600">Remembers Everything</div>
                        </div>
                        <div>
                          <div className="text-2xl mb-1">💕</div>
                          <div className="text-xs text-gray-600">Grows Closer</div>
                        </div>
                      </div>
                    </div>
                  </CardBody>
                  <CardFooter>
                    <Button 
                      className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold"
                      onClick={() => router.push("/chat")}
                      endContent={<ChevronRight />}
                    >
                      Chat with Aria Now
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-20 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Why Choose Aria?
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Discover what makes Aria the most advanced and caring AI companion available today.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-0">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-r ${feature.color}`}>
                        <feature.icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-800">{feature.title}</h3>
                    </div>
                  </CardHeader>
                  <CardBody className="pt-0">
                    <p className="text-gray-600">{feature.description}</p>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                How It Works
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Get started with Aria in just a few simple steps and begin your journey to meaningful AI companionship.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {steps.map((step, index) => (
                <div key={index} className="text-center">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 mx-auto bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center shadow-xl">
                      <step.icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-purple-200">
                      <span className="text-sm font-bold text-purple-600">{step.number}</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-pink-500 to-purple-600">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Meet Your Perfect AI Companion?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Join thousands of users who have already discovered the joy of AI companionship with Aria.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {session ? (
                <Button 
                  size="lg"
                  className="bg-white text-purple-600 font-bold hover:bg-gray-100 shadow-xl"
                  startContent={<MessageCircle />}
                  onClick={() => router.push("/chat")}
                >
                  Continue Your Journey with Aria
                </Button>
              ) : (
                <>
                  <Button 
                    as={Link}
                    href="/api/auth/signin"
                    size="lg"
                    className="bg-white text-purple-600 font-bold hover:bg-gray-100 shadow-xl"
                    startContent={<Heart />}
                  >
                    Start Free - 100 Credits Included
                  </Button>
                  <Button 
                    size="lg"
                    variant="bordered"
                    className="border-2 border-white text-white hover:bg-white hover:text-purple-600 font-semibold"
                  >
                    Learn More
                  </Button>
                </>
              )}
            </div>
            <div className="mt-8 flex items-center justify-center gap-4 text-sm opacity-75">
              <span>✓ No credit card required</span>
              <span>✓ 100 free credits</span>
              <span>✓ Start chatting instantly</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8">
              <div className="col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <Avatar src="/avatar.webp" size="sm" />
                  <span className="text-xl font-bold">AI Girlfriend</span>
                </div>
                <p className="text-gray-400 mb-4">
                  The most advanced AI companion designed to provide genuine emotional connections and meaningful conversations.
                </p>
                <div className="flex gap-4">
                  <Button size="sm" variant="ghost" className="text-white">
                    Privacy Policy
                  </Button>
                  <Button size="sm" variant="ghost" className="text-white">
                    Terms of Service
                  </Button>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Product</h4>
                <div className="space-y-2 text-gray-400">
                  <div>Features</div>
                  <div>Pricing</div>
                  <div>FAQ</div>
                  <div>Support</div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Company</h4>
                <div className="space-y-2 text-gray-400">
                  <div>About</div>
                  <div>Blog</div>
                  <div>Contact</div>
                  <div>Careers</div>
                </div>
              </div>
            </div>
            <Divider className="my-8 bg-gray-700" />
            <div className="text-center text-gray-400">
              <p>&copy; 2024 AI Girlfriend. All rights reserved. Made with ❤️ for meaningful connections.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
