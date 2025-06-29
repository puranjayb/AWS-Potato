"use client";
import React, { JSX, useEffect, useState } from "react";
import {
  Heart,
  Shield,
  Clock,
  Users,
  ArrowRight,
  Stethoscope,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

interface MousePosition {
  x: number;
  y: number;
}

interface FloatingParticle {
  id: number;
  left: number;
  top: number;
  delay: number;
}

interface FeatureItem {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  delay: number;
}

export default function LandingPage(): JSX.Element {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [mousePosition, setMousePosition] = useState<MousePosition>({
    x: 0,
    y: 0,
  });
  const [isClient, setIsClient] = useState<boolean>(false);
  const [particles, setParticles] = useState<FloatingParticle[]>([]);
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  // Initialize particles only on client side to avoid hydration mismatch
  useEffect(() => {
    setIsClient(true);

    // Generate particles with consistent values
    const newParticles: FloatingParticle[] = Array.from(
      { length: 20 },
      (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 3,
      })
    );
    setParticles(newParticles);

    setIsVisible(true);

    const handleMouseMove = (e: MouseEvent): void => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return (): void => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const FloatingElement: React.FC<{
    delay: number;
    children: React.ReactNode;
    className?: string;
  }> = ({ delay, children, className = "" }) => (
    <div
      className={`animate-float ${className}`}
      style={{
        animationDelay: `${delay}s`,
        animationDuration: "6s",
      }}
    >
      {children}
    </div>
  );

  const handleGetStarted = (): void => {
    // Handle navigation to signup
    console.log("Navigate to signup");
    router.push("/signup");
  };

  const handleLogin = (): void => {
    // Handle navigation to login
    console.log("Navigate to login");
    router.push("/login");
  };

  const handleLearnMore = (): void => {
    // Handle learn more action
    console.log("Learn more clicked");
  };

  const features: FeatureItem[] = [
    {
      icon: Clock,
      title: "Medicine Reminder",
      desc: "Never miss your medications with smart scheduling and notifications",
      delay: 0,
    },
    {
      icon: Shield,
      title: "Emergency Services",
      desc: "Quick access to emergency contacts and nearest medical facilities",
      delay: 0.1,
    },
    {
      icon: Stethoscope,
      title: "Hospital Finder",
      desc: "Locate nearby hospitals and healthcare providers instantly",
      delay: 0.2,
    },
    {
      icon: Users,
      title: "Family Care",
      desc: "Manage health records for your entire family in one place",
      delay: 0.3,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements - Only render dynamic styles on client */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse transition-all duration-1000"
          style={
            isClient
              ? {
                  left: `${mousePosition.x * 0.02}px`,
                  top: `${mousePosition.y * 0.02}px`,
                }
              : {
                  left: "0px",
                  top: "0px",
                }
          }
        />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-2000" />
      </div>

      {/* Floating Particles - Only render after hydration */}
      {isClient && (
        <div className="absolute inset-0 pointer-events-none">
          {particles.map((particle: FloatingParticle) => (
            <FloatingElement key={particle.id} delay={particle.id * 0.2}>
              <div
                className="absolute w-2 h-2 bg-white/20 rounded-full animate-twinkle"
                style={{
                  left: `${particle.left}%`,
                  top: `${particle.top}%`,
                  animationDelay: `${particle.delay}s`,
                }}
              />
            </FloatingElement>
          ))}
        </div>
      )}

      {/* Header */}
      <header
        className={`relative z-10 transition-all duration-1000 ${
          isVisible
            ? "translate-y-0 opacity-100"
            : "-translate-y-full opacity-0"
        }`}
      >
        <div className="backdrop-blur-lg bg-white/5 border-b border-white/10 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <button
                className="flex items-center space-x-2 group"
                onClick={() => router.push("/")}
              >
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-blue-500/25">
                  <Heart className="w-6 h-6 text-white animate-pulse" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  HealthCare+
                </span>
              </button>

              <nav className="hidden md:flex items-center space-x-8">
                {(["Features", "Services", "About"] as const).map(
                  (item: string, index: number) => (
                    <a
                      key={item}
                      href={`#${item.toLowerCase()}`}
                      className="relative text-white/70 hover:text-white transition-all duration-300 group"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      {item}
                      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 group-hover:w-full transition-all duration-300" />
                    </a>
                  )
                )}
              </nav>

              <div className="md:flex hidden items-center space-x-4">
                {isAuthenticated ? (
                  <button
                    className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105 transform cursor-pointer"
                    onClick={() => router.push("/reports")}
                    type="button"
                  >
                    Reports
                  </button>
                ) : (
                  <div className="flex items-center space-x-4">
                    <button
                      className="px-6 py-2 text-white/70 hover:text-white border border-white/20 rounded-full backdrop-blur-sm bg-white/5 hover:bg-white/10 transition-all duration-300 hover:scale-105"
                      onClick={handleLogin}
                      type="button"
                    >
                      Login
                    </button>
                    <button
                      className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105 transform"
                      onClick={handleGetStarted}
                      type="button"
                    >
                      Get Started
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div
            className={`transition-all duration-1000 delay-300 ${
              isVisible
                ? "translate-y-0 opacity-100"
                : "translate-y-20 opacity-0"
            }`}
          >
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Your Health,{" "}
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient">
                Our Priority
              </span>
            </h1>
            <p className="text-xl text-white/70 mb-8 max-w-3xl mx-auto leading-relaxed">
              Comprehensive healthcare management system with medicine
              reminders, emergency services, nearby hospital finder, and
              personalized diet planning.
            </p>
          </div>

          <div
            className={`flex flex-col sm:flex-row gap-4 justify-center transition-all duration-1000 delay-500 ${
              isVisible
                ? "translate-y-0 opacity-100"
                : "translate-y-20 opacity-0"
            }`}
          >
            <button
              className="group items-center relative bg-gradient-to-r from-blue-500 to-purple-600 text-white text-lg px-8 py-3 rounded-full inline-flex hover:shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105 transform overflow-hidden"
              onClick={handleGetStarted}
            >
              <div className="flex justify-center items-center">
                <span className="relative flex items-center">
                  Start Your Journey
                </span>
                <ArrowRight className="group-hover:translate-x-1 transition-transform duration-300" />
              </div>
            </button>
            <button
              className="text-white text-lg px-8 py-3 border border-white/20 rounded-full backdrop-blur-sm bg-white/5 hover:bg-white/10 transition-all duration-300 hover:scale-105"
              onClick={handleLearnMore}
              type="button"
            >
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="relative z-10 py-20 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-7xl mx-auto">
          <div
            className={`text-center mb-16 transition-all duration-1000 delay-200 ${
              isVisible
                ? "translate-y-0 opacity-100"
                : "translate-y-20 opacity-0"
            }`}
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Healthcare Made{" "}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Simple
              </span>
            </h2>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              Comprehensive healthcare solutions designed for modern families
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature: FeatureItem) => (
              <div
                key={feature.title}
                className={`group transition-all duration-1000 ${
                  isVisible
                    ? "translate-y-0 opacity-100"
                    : "translate-y-20 opacity-0"
                }`}
                style={{ transitionDelay: `${600 + feature.delay * 200}ms` }}
              >
                <div className="relative h-60 p-6 rounded-2xl backdrop-blur-lg bg-white/5 border border-white/10 text-center hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/10 group overflow-hidden">
                  {/* Hover effect background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />

                  <div className="relative z-10">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-blue-500/25">
                      <feature.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-blue-300 transition-colors duration-300">
                      {feature.title}
                    </h3>
                    <p className="text-white/70 group-hover:text-white/90 transition-colors duration-300">
                      {feature.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div
          className={`max-w-4xl mx-auto text-center transition-all duration-1000 delay-700 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
          }`}
        >
          <div className="relative p-12 rounded-3xl backdrop-blur-lg bg-gradient-to-r from-white/10 to-white/5 border border-white/20 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-3xl" />
            <div className="relative z-10">
              <h2 className="text-4xl font-bold text-white mb-6">
                Ready to Take Control of Your{" "}
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Health?
                </span>
              </h2>
              <p className="text-xl text-white/70 mb-8">
                Join thousands of families who trust HealthCare+ for their
                medical needs
              </p>
              <button
                className="group relative bg-gradient-to-r from-blue-500 to-purple-600 text-white text-lg px-12 py-4 rounded-full inline-flex items-center hover:shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105 transform overflow-hidden"
                onClick={handleGetStarted}
                type="button"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative flex items-center">
                  Get Started Today
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className={`relative z-10 border-t border-white/10 py-12 px-4 sm:px-6 lg:px-8 transition-all duration-1000 delay-900 ${
          isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
        }`}
      >
        <div className="backdrop-blur-lg bg-white/5">
          <div className="max-w-7xl mx-auto text-center py-8">
            <div className="flex items-center justify-center space-x-2 mb-4 group">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-blue-500/25">
                <Heart className="w-5 h-5 text-white animate-pulse" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                HealthCare+
              </span>
            </div>
            <p className="text-white/50">
              © 2025 HealthCare+. All rights reserved. Your health, our
              commitment.
            </p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          33% {
            transform: translateY(-10px) rotate(1deg);
          }
          66% {
            transform: translateY(5px) rotate(-1deg);
          }
        }

        @keyframes twinkle {
          0%,
          100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }

        @keyframes gradient {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-twinkle {
          animation: twinkle 3s ease-in-out infinite;
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
}
