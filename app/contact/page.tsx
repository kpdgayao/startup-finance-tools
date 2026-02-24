"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, CheckCircle2, AlertCircle } from "lucide-react";

const INQUIRY_TYPES = [
  { value: "Consulting & Mentoring", description: "1-on-1 startup finance advice" },
  { value: "Speaking & Workshops", description: "Book Kevin for events or training" },
  { value: "Partnership", description: "Collaboration or integration opportunities" },
  { value: "General Inquiry", description: "Everything else" },
] as const;

const COOLDOWN_KEY = "contact-form-last-sent";
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [inquiryType, setInquiryType] = useState("");
  const [organization, setOrganization] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const canSubmit =
    name.trim() &&
    email.trim() &&
    inquiryType &&
    message.trim().length >= 10 &&
    status !== "loading";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    // Cooldown check
    const lastSent = sessionStorage.getItem(COOLDOWN_KEY);
    if (lastSent && Date.now() - parseInt(lastSent) < COOLDOWN_MS) {
      const remaining = Math.ceil(
        (COOLDOWN_MS - (Date.now() - parseInt(lastSent))) / 60000
      );
      setErrorMessage(
        `Please wait ${remaining} more minute${remaining > 1 ? "s" : ""} before sending another message.`
      );
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          inquiryType,
          organization: organization.trim(),
          message: message.trim(),
          website, // honeypot
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      sessionStorage.setItem(COOLDOWN_KEY, String(Date.now()));
      setStatus("success");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Contact Kevin</h1>
          <p className="text-muted-foreground mt-1">
            Get in touch for consulting, speaking, partnerships, or general inquiries.
          </p>
        </div>

        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center gap-3 py-8">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <h2 className="text-xl font-semibold">Message Sent</h2>
              <p className="text-muted-foreground max-w-md">
                Thanks for reaching out! Kevin will get back to you at{" "}
                <span className="font-medium text-foreground">{email}</span>{" "}
                as soon as possible.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setName("");
                  setEmail("");
                  setInquiryType("");
                  setOrganization("");
                  setMessage("");
                  setStatus("idle");
                }}
              >
                Send Another Message
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Contact Kevin</h1>
        <p className="text-muted-foreground mt-1">
          Get in touch for consulting, speaking, partnerships, or general inquiries.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Send a Message</CardTitle>
          <CardDescription>
            Kevin (CPA, MBA, CEO of IOL Inc.) typically responds within 1-2
            business days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="contact-name"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={200}
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="contact-email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={200}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact-inquiry">
                  Inquiry Type <span className="text-destructive">*</span>
                </Label>
                <Select value={inquiryType} onValueChange={setInquiryType}>
                  <SelectTrigger id="contact-inquiry">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {INQUIRY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-org">Organization</Label>
                <Input
                  id="contact-org"
                  placeholder="Company or organization"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  maxLength={200}
                  autoComplete="organization"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-message">
                Message <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="contact-message"
                placeholder="Tell Kevin what you're looking for..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                minLength={10}
                maxLength={5000}
                rows={6}
              />
              <p className="text-xs text-muted-foreground text-right">
                {message.length}/5000
              </p>
            </div>

            {/* Honeypot — hidden from humans */}
            <div className="absolute -left-[9999px]" aria-hidden="true">
              <label htmlFor="contact-website">Website</label>
              <input
                id="contact-website"
                type="text"
                name="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            {status === "error" && errorMessage && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto">
              {status === "loading" ? (
                <>Sending...</>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
