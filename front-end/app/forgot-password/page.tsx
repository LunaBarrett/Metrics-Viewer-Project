'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // TODO: Replace with actual password reset logic
      setTimeout(() => {
        setSubmitted(true)
        setIsLoading(false)
      }, 1000)
    } catch (err) {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ backgroundColor: '#1a1625', minHeight: '100vh' }} className="flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="p-8 shadow-lg">
          {/* Logo Section */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary mb-4">
              <span className="text-lg font-bold text-primary-foreground">◆</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Reset Password</h1>
          </div>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-10"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 font-medium"
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>

              <div className="text-center">
                <Link
                  href="/login"
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Back to login
                </Link>
              </div>
            </form>
          ) : (
            <div className="space-y-6 text-center">
              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-sm text-foreground">
                  ✓ Password reset link sent to <span className="font-medium">{email}</span>
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Check your email for a link to reset your password. The link will expire in 1 hour.
              </p>
              <Link
                href="/login"
                className="inline-block text-sm text-primary hover:underline font-medium"
              >
                Back to login
              </Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
