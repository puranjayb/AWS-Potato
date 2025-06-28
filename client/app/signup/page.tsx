"use client";
import React, { useState, useEffect, ReactNode, JSX } from "react";
import {
  Heart,
  Mail,
  User,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { useSignup } from "@/hooks/useAuth";

interface SignupForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

interface FloatingElementProps {
  delay: number;
  children: ReactNode;
  className?: string;
}

interface MousePosition {
  x: number;
  y: number;
}

interface FeatureBenefit {
  text: string;
  icon: string;
}

export default function SignupPage(): JSX.Element {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState<boolean>(false);
  const [formData, setFormData] = useState<SignupForm>({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [mousePosition, setMousePosition] = useState<MousePosition>({
    x: 0,
    y: 0,
  });
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<number>(0);

  const signupMutation = useSignup();

  useEffect((): (() => void) => {
    setIsVisible(true);

    const handleMouseMove = (e: MouseEvent): void => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return (): void => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Calculate password strength
  useEffect((): void => {
    const calculateStrength = (password: string): number => {
      let strength = 0;
      if (password.length >= 8) strength += 25;
      if (/[a-z]/.test(password)) strength += 25;
      if (/[A-Z]/.test(password)) strength += 25;
      if (/[0-9]/.test(password)) strength += 25;
      return strength;
    };

    setPasswordStrength(calculateStrength(formData.password));
  }, [formData.password]);

  const FloatingElement: React.FC<FloatingElementProps> = ({
    delay,
    children,
    className = "",
  }) => (
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

  const validateField = (
    field: keyof SignupForm,
    value: string
  ): string | undefined => {
    switch (field) {
      case "username":
        if (!value.trim()) return "Username is required";
        if (value.length < 3) return "Username must be at least 3 characters";
        break;
      case "email":
        if (!value.trim()) return "Email is required";
        if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)) {
          return "Invalid email address";
        }
        break;
      case "password":
        if (!value.trim()) return "Password is required";
        if (value.length < 8) return "Password must be at least 8 characters";
        break;
      case "confirmPassword":
        if (!value.trim()) return "Please confirm your password";
        if (value !== formData.password) return "Passwords do not match";
        break;
    }
    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    Object.keys(formData).forEach((key) => {
      const field = key as keyof SignupForm;
      const error = validateField(field, formData[field]);
      if (error) newErrors[field] = error;
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (): void => {
    if (validateForm()) {
      const { confirmPassword, ...submitData } = formData;
      console.log("Submitting signup data:", confirmPassword, submitData);
      signupMutation.mutate(submitData);
    }
  };

  const handleInputChange = (field: keyof SignupForm, value: string): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Real-time validation
    const error = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleKeyPress = (e: React.KeyboardEvent): void => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  const handleFocus = (fieldName: string): void => {
    setFocusedField(fieldName);
  };

  const handleBlur = (): void => {
    setFocusedField(null);
  };

  const getPasswordStrengthColor = (): string => {
    if (passwordStrength < 25) return "bg-red-400";
    if (passwordStrength < 50) return "bg-yellow-400";
    if (passwordStrength < 75) return "bg-blue-400";
    return "bg-green-400";
  };

  const getPasswordStrengthText = (): string => {
    if (passwordStrength < 25) return "Weak";
    if (passwordStrength < 50) return "Fair";
    if (passwordStrength < 75) return "Good";
    return "Strong";
  };

  const features: FeatureBenefit[] = [
    { text: "Medicine Reminders", icon: "💊" },
    { text: "Emergency Services", icon: "🚨" },
    { text: "Hospital Finder", icon: "🏥" },
    { text: "Family Health Records", icon: "👨‍👩‍👧‍👦" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br py-10 from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden flex items-center justify-center px-4 sm:px-6 lg:px-8">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"
          style={{
            left: `${mousePosition.x * 0.02}px`,
            top: `${mousePosition.y * 0.02}px`,
          }}
        />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-2000" />
        <div className="absolute top-3/4 right-1/3 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-3000" />
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {([...Array(20)] as undefined[]).map((_: undefined, i: number) => (
          <FloatingElement key={i} delay={i * 0.3}>
            <div
              className="absolute w-1.5 h-1.5 bg-white/20 rounded-full animate-twinkle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
              }}
            />
          </FloatingElement>
        ))}
      </div>

      <div
        className={`max-w-md w-full space-y-8 relative z-10 transition-all duration-1000 ${
          isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
        }`}
      >
        {/* Header */}
        <div
          className={`text-center transition-all duration-1000 delay-200 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          <Link
            href="/"
            className="inline-flex items-center space-x-2 mb-8 group"
          >
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-blue-500/25">
              <Heart className="w-7 h-7 text-white animate-pulse" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              HealthCare+
            </span>
          </Link>
          <h2 className="text-3xl font-bold text-white mb-2">
            Create Your Account
          </h2>
          <p className="text-white/70">
            Join thousands of families managing their health better
          </p>
        </div>

        {/* Signup Form */}
        <div
          className={`relative transition-all duration-1000 delay-400 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          <div className="relative p-8 rounded-2xl backdrop-blur-lg bg-white/10 border border-white/20 shadow-2xl hover:bg-white/15 transition-all duration-300">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl" />

            <div className="relative z-10 space-y-6">
              {/* Username */}
              <div className="group">
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-white/90 mb-2 transition-colors duration-300"
                >
                  Username
                </label>
                <div className="relative">
                  <User
                    className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${
                      focusedField === "username"
                        ? "text-blue-400"
                        : "text-white/50"
                    }`}
                  />
                  <input
                    id="username"
                    type="text"
                    value={formData.username}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                      handleInputChange("username", e.target.value)
                    }
                    onFocus={(): void => handleFocus("username")}
                    onBlur={handleBlur}
                    onKeyPress={handleKeyPress}
                    className={`w-full pl-10 pr-4 py-3 rounded-lg backdrop-blur-sm bg-white/5 border transition-all duration-300 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 hover:bg-white/10 ${
                      errors.username
                        ? "border-red-400/50 focus:border-red-400"
                        : focusedField === "username"
                        ? "border-blue-400/50"
                        : "border-white/20 hover:border-white/30"
                    }`}
                    placeholder="Enter your username"
                  />
                </div>
                {errors.username && (
                  <p className="mt-1 text-sm text-red-400 animate-fadeIn">
                    {errors.username}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="group">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-white/90 mb-2 transition-colors duration-300"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${
                      focusedField === "email"
                        ? "text-blue-400"
                        : "text-white/50"
                    }`}
                  />
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                      handleInputChange("email", e.target.value)
                    }
                    onFocus={(): void => handleFocus("email")}
                    onBlur={handleBlur}
                    onKeyPress={handleKeyPress}
                    className={`w-full pl-10 pr-4 py-3 rounded-lg backdrop-blur-sm bg-white/5 border transition-all duration-300 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 hover:bg-white/10 ${
                      errors.email
                        ? "border-red-400/50 focus:border-red-400"
                        : focusedField === "email"
                        ? "border-blue-400/50"
                        : "border-white/20 hover:border-white/30"
                    }`}
                    placeholder="Enter your email"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-400 animate-fadeIn">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="group">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-white/90 mb-2 transition-colors duration-300"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${
                      focusedField === "password"
                        ? "text-blue-400"
                        : "text-white/50"
                    }`}
                  />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                      handleInputChange("password", e.target.value)
                    }
                    onFocus={(): void => handleFocus("password")}
                    onBlur={handleBlur}
                    onKeyPress={handleKeyPress}
                    className={`w-full pl-10 pr-12 py-3 rounded-lg backdrop-blur-sm bg-white/5 border transition-all duration-300 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 hover:bg-white/10 ${
                      errors.password
                        ? "border-red-400/50 focus:border-red-400"
                        : focusedField === "password"
                        ? "border-blue-400/50"
                        : "border-white/20 hover:border-white/30"
                    }`}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={(): void => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors duration-300 hover:scale-110"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="mt-2 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-white/70">Password Strength</span>
                      <span
                        className={`font-medium ${
                          passwordStrength >= 75
                            ? "text-green-400"
                            : passwordStrength >= 50
                            ? "text-blue-400"
                            : passwordStrength >= 25
                            ? "text-yellow-400"
                            : "text-red-400"
                        }`}
                      >
                        {getPasswordStrengthText()}
                      </span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${getPasswordStrengthColor()}`}
                        style={{ width: `${passwordStrength}%` }}
                      />
                    </div>
                  </div>
                )}

                {errors.password && (
                  <p className="mt-1 text-sm text-red-400 animate-fadeIn">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="group">
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-white/90 mb-2 transition-colors duration-300"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock
                    className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${
                      focusedField === "confirmPassword"
                        ? "text-blue-400"
                        : "text-white/50"
                    }`}
                  />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                      handleInputChange("confirmPassword", e.target.value)
                    }
                    onFocus={(): void => handleFocus("confirmPassword")}
                    onBlur={handleBlur}
                    onKeyPress={handleKeyPress}
                    className={`w-full pl-10 pr-12 py-3 rounded-lg backdrop-blur-sm bg-white/5 border transition-all duration-300 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 hover:bg-white/10 ${
                      errors.confirmPassword
                        ? "border-red-400/50 focus:border-red-400"
                        : focusedField === "confirmPassword"
                        ? "border-blue-400/50"
                        : "border-white/20 hover:border-white/30"
                    }`}
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={(): void =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors duration-300 hover:scale-110"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Password Match Indicator */}
                {formData.confirmPassword && formData.password && (
                  <div className="mt-1 flex items-center text-xs animate-fadeIn">
                    {formData.password === formData.confirmPassword ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-green-400 mr-1" />
                        <span className="text-green-400">Passwords match</span>
                      </>
                    ) : (
                      <span className="text-red-400">
                        Passwords do not match
                      </span>
                    )}
                  </div>
                )}

                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-400 animate-fadeIn">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={signupMutation.isPending}
                className="group relative w-full py-3 text-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105 transform overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative flex items-center justify-center">
                  {signupMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-2" />
                      Creating Account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </span>
              </button>
            </div>

            {/* Login Link */}
            <div className="relative z-10 mt-6 text-center">
              <p className="text-white/70">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-blue-400 hover:text-blue-300 font-medium transition-colors duration-300 hover:underline"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div
          className={`text-center transition-all duration-1000 delay-600 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          <div className="relative p-6 rounded-2xl backdrop-blur-lg bg-white/5 border border-white/10 shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl" />
            <div className="relative z-10">
              <p className="text-sm text-white/70 mb-4 font-medium">
                What you`ll get:
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {features.map((feature: FeatureBenefit, index: number) => (
                  <div
                    key={feature.text}
                    className="flex items-center space-x-2 text-white/80 hover:text-white transition-colors duration-300 group"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <span className="text-lg group-hover:scale-110 transition-transform duration-300">
                      {feature.icon}
                    </span>
                    <span className="text-xs font-medium">{feature.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          33% {
            transform: translateY(-8px) rotate(1deg);
          }
          66% {
            transform: translateY(4px) rotate(-1deg);
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

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-twinkle {
          animation: twinkle 3s ease-in-out infinite;
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
