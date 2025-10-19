import React from "react"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { 
  Navbar, 
  NavbarBrand, 
  NavbarContent, 
  NavbarItem,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
  Button,
  Avatar,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Chip,
  Badge
} from "@nextui-org/react"
import { 
  Heart, 
  MessageCircle, 
  BarChart3, 
  Settings, 
  LogOut, 
  User,
  Sparkles
} from "lucide-react"
import { api } from "@/trpc/react"

export function AppNavigation() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)

  const { data: userProfile } = api.aiGirlfriend.getUserProfile.useQuery(
    undefined,
    { enabled: !!session }
  )

  const menuItems = session ? [
    { name: "Chat", href: "/chat", icon: MessageCircle },
    { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  ] : []

  const getRelationshipStageColor = (stage?: string) => {
    switch (stage) {
      case "new": return "primary"
      case "comfortable": return "secondary" 
      case "intimate": return "warning"
      case "established": return "danger"
      default: return "default"
    }
  }

  const getRelationshipStageEmoji = (stage?: string) => {
    switch (stage) {
      case "new": return "🌱"
      case "comfortable": return "🌸"
      case "intimate": return "💕"
      case "established": return "💑"
      default: return "💫"
    }
  }

  return (
    <Navbar 
      onMenuOpenChange={setIsMenuOpen}
      className="fixed top-0 z-50 w-full border-b border-gray-200/50 bg-white/95 backdrop-blur-lg shadow-sm supports-[backdrop-filter]:bg-white/60"
      maxWidth="full"
      position="static"
    >
      <NavbarContent>
        <NavbarMenuToggle
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          className="sm:hidden"
        />
        <NavbarBrand>
          <Link href="/" className="flex items-center gap-2">
            <div className="relative">
              <Avatar
                src="/avatar.webp"
                size="sm"
                className="ring-2 ring-pink-500/20"
              />
              <div className="absolute -right-1 -top-1">
                <div className="h-3 w-3 animate-pulse rounded-full bg-gradient-to-r from-pink-500 to-purple-500" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-lg font-bold text-transparent">
                AI Girlfriend
              </span>
              <span className="text-xs font-medium text-gray-500">
                Your AI Companion
              </span>
            </div>
          </Link>
        </NavbarBrand>
      </NavbarContent>

      {session && (
        <NavbarContent className="hidden gap-4 sm:flex" justify="center">
          <NavbarItem>
            <Link href="/chat">
              <Button 
                variant="ghost" 
                className="font-medium"
                startContent={<MessageCircle size={16} />}
              >
                Chat with Aria
              </Button>
            </Link>
          </NavbarItem>
          <NavbarItem>
            <Link href="/dashboard">
              <Button 
                variant="ghost" 
                className="font-medium"
                startContent={<BarChart3 size={16} />}
              >
                Analytics
              </Button>
            </Link>
          </NavbarItem>
        </NavbarContent>
      )}

      <NavbarContent justify="end">
        {session ? (
          <>
            {/* Credits Display */}
            <NavbarItem className="hidden sm:flex">
              <Chip
                startContent={<Sparkles size={14} />}
                variant="flat"
                color="warning"
                className="font-semibold"
              >
                {userProfile?.user.credits || 0} Credits
              </Chip>
            </NavbarItem>

            {/* Relationship Status */}
            {userProfile?.relationshipStage && (
              <NavbarItem className="hidden md:flex">
                <Chip
                  variant="flat"
                  color={getRelationshipStageColor(userProfile.relationshipStage)}
                  className="capitalize font-medium"
                >
                  {getRelationshipStageEmoji(userProfile.relationshipStage)} {userProfile.relationshipStage}
                </Chip>
              </NavbarItem>
            )}

            {/* User Dropdown */}
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <Avatar
                  isBordered
                  as="button"
                  className="transition-transform"
                  color="primary"
                  name={session.user?.name?.[0]}
                  size="sm"
                  src={session.user?.image || undefined}
                />
              </DropdownTrigger>
              <DropdownMenu aria-label="Profile Actions" variant="flat">
                <DropdownItem key="profile" className="h-14 gap-2">
                  <p className="font-semibold">Signed in as</p>
                  <p className="font-semibold">{session.user?.email}</p>
                </DropdownItem>
                <DropdownItem 
                  key="credits" 
                  startContent={<Sparkles className="text-lg" />}
                  className="sm:hidden"
                >
                  {userProfile?.user.credits || 0} Credits
                </DropdownItem>
                <DropdownItem 
                  key="relationship" 
                  startContent={<Heart className="text-lg" />}
                  className="md:hidden"
                >
                  {getRelationshipStageEmoji(userProfile?.relationshipStage)} {userProfile?.relationshipStage || "new"}
                </DropdownItem>
                <DropdownItem 
                  key="settings" 
                  startContent={<Settings className="text-lg" />}
                >
                  Settings
                </DropdownItem>
                <DropdownItem 
                  key="logout" 
                  color="danger" 
                  startContent={<LogOut className="text-lg" />}
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  Log Out
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </>
        ) : (
          <NavbarItem>
            <Button 
              as={Link}
              href="/api/auth/signin"
              color="primary"
              variant="shadow"
              className="bg-gradient-to-r from-pink-500 to-purple-600 font-semibold"
              startContent={<User size={16} />}
            >
              Sign In
            </Button>
          </NavbarItem>
        )}
      </NavbarContent>

      {/* Mobile Menu */}
      <NavbarMenu>
        {menuItems.map((item, index) => (
          <NavbarMenuItem key={`${item.name}-${index}`}>
            <Link
              className="flex w-full items-center gap-2 text-lg"
              href={item.href}
              onClick={() => setIsMenuOpen(false)}
            >
              <item.icon size={20} />
              {item.name}
            </Link>
          </NavbarMenuItem>
        ))}
        {session && (
          <NavbarMenuItem>
            <Button
              className="w-full justify-start text-lg"
              color="danger"
              variant="light"
              startContent={<LogOut size={20} />}
              onClick={() => {
                setIsMenuOpen(false)
                signOut({ callbackUrl: "/" })
              }}
            >
              Log Out
            </Button>
          </NavbarMenuItem>
        )}
      </NavbarMenu>
    </Navbar>
  )
}