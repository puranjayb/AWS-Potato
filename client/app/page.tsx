// app/page.tsx
'use client'
import Link from 'next/link'
import { Heart, Shield, Clock, Users, ArrowRight, Stethoscope } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-dark-primary">
      {/* Header */}
      <header className="border-b border-dark-accent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-primary-400">HealthCare+</span>
            </div>
            
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="#features" className="text-dark-secondary hover:text-primary-400 transition-colors">
                Features
              </Link>
              <Link href="#services" className="text-dark-secondary hover:text-primary-400 transition-colors">
                Services
              </Link>
              <Link href="#about" className="text-dark-secondary hover:text-primary-400 transition-colors">
                About
              </Link>
            </nav>

            <div className="flex items-center space-x-4">
              <Link href="/login" className="btn-secondary">
                Login
              </Link>
              <Link href="/signup" className="btn-primary">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-dark-primary mb-6">
            Your Health,{' '}
            <span className="text-primary-400">Our Priority</span>
          </h1>
          <p className="text-xl text-dark-secondary mb-8 max-w-3xl mx-auto">
            Comprehensive healthcare management system with medicine reminders, 
            emergency services, nearby hospital finder, and personalized diet planning.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="btn-primary text-lg px-8 py-3 inline-flex items-center">
              Start Your Journey
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link href="#features" className="btn-secondary text-lg px-8 py-3">
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-dark-secondary/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-dark-primary mb-4">
              Healthcare Made Simple
            </h2>
            <p className="text-xl text-dark-secondary max-w-2xl mx-auto">
              Comprehensive healthcare solutions designed for modern families
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="card text-center hover:border-primary-500 transition-colors">
              <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-dark-primary mb-2">
                Medicine Reminder
              </h3>
              <p className="text-dark-secondary">
                Never miss your medications with smart scheduling and notifications
              </p>
            </div>

            <div className="card text-center hover:border-primary-500 transition-colors">
              <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-dark-primary mb-2">
                Emergency Services
              </h3>
              <p className="text-dark-secondary">
                Quick access to emergency contacts and nearest medical facilities
              </p>
            </div>

            <div className="card text-center hover:border-primary-500 transition-colors">
              <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Stethoscope className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-dark-primary mb-2">
                Hospital Finder
              </h3>
              <p className="text-dark-secondary">
                Locate nearby hospitals and healthcare providers instantly
              </p>
            </div>

            <div className="card text-center hover:border-primary-500 transition-colors">
              <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-dark-primary mb-2">
                Family Care
              </h3>
              <p className="text-dark-secondary">
                Manage health records for your entire family in one place
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-dark-primary mb-6">
            Ready to Take Control of Your Health?
          </h2>
          <p className="text-xl text-dark-secondary mb-8">
            Join thousands of families who trust HealthCare+ for their medical needs
          </p>
          <Link href="/signup" className="btn-primary text-lg px-12 py-4 inline-flex items-center">
            Get Started Today
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-dark-accent py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-primary-400">HealthCare+</span>
          </div>
          <p className="text-dark-muted">
            © 2025 HealthCare+. All rights reserved. Your health, our commitment.
          </p>
        </div>
      </footer>
    </div>
  )
}