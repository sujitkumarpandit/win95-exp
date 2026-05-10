import React from 'react';
import { WinWindow, WinInset } from '../components/RetroUI';
import { motion } from 'motion/react';
import {
  Mail,
  Github,
  Linkedin,
  Twitter,
  Phone,
  Globe,
  User,
  HelpCircle,
  ExternalLink,
  MessageSquare
} from 'lucide-react';

export default function Help() {
  const developerInfo = {
    name: "Sujit Kumar Pandit",
    title: "Full Stack Developer & UI/UX Designer",
    email: "sujitpandit.dev@gmail.com",
    github: "https://github.com/sujitkumarpandit",
    linkedin: "https://www.linkedin.com/in/sujit-kumar-pandit-skp/",
    twitter: "https://x.com/SujtKP",
    phone: "+91 82500 XXXXX",
    location: "Assam, India",
    bio: "Passionate about building functional and beautiful web applications. Specialized in React, Node.js, PostgreSQL, and scalable full-stack architectures."
  };

  const socialLinks = [
  {
    icon: <Mail size={16} />,
    label: "Email",
    value: "sujitpandit.dev@gmail.com",
    href: "mailto:sujitpandit.dev@gmail.com",
  },
  {
    icon: <Github size={16} />,
    label: "GitHub",
    value: "sujitkumarpandit",
    href: "https://github.com/sujitkumarpandit",
  },
  {
    icon: <Linkedin size={16} />,
    label: "LinkedIn",
    value: "Sujit kr Pandit",
    href: "https://www.linkedin.com/in/sujit-kumar-pandit-skp/",
  },
  {
    icon: <Twitter size={16} />,
    label: "Twitter",
    value: "@SujitKP",
    href: "https://x.com/SujtKP",
  },
];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-6 max-w-4xl mx-auto px-2 sm:px-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Profile Column */}
        <div className="md:col-span-1 space-y-6">
          <WinWindow title="Developer Profile" className="h-full">
            <div className="flex flex-col items-center text-center p-2">
              
              <WinInset className="w-24 h-24 bg-[#C0C0C0] p-1 mb-4 flex items-center justify-center overflow-hidden">
                <div className="w-full h-full bg-[#808080] flex items-center justify-center text-white">
                  <User size={48} />
                </div>
              </WinInset>

              <h2 className="text-lg font-bold uppercase tracking-tight">
                {developerInfo.name}
              </h2>

              <p className="text-xs text-gray-600 mb-4">
                {developerInfo.title}
              </p>

              <div className="w-full space-y-2 text-left">
                <div className="flex items-center gap-2 text-xs">
                  <Phone size={12} className="text-[#000080]" />
                  <span>{developerInfo.phone}</span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <Globe size={12} className="text-[#000080]" />
                  <span>{developerInfo.location}</span>
                </div>
              </div>
            </div>
          </WinWindow>
        </div>

        {/* Content Column */}
        <div className="md:col-span-2 space-y-6">

          {/* About Project */}
          <WinWindow title="About This Project">
            <div className="space-y-4">
              <p className="text-sm leading-relaxed">
                This Expense Tracker application is designed with a retro
                Windows 95 aesthetic, combining nostalgic UI patterns with
                modern full-stack technologies.
              </p>

              <p className="text-sm leading-relaxed">
                Features include secure authentication, expense analytics,
                responsive layouts, cloud database integration, and scalable
                backend APIs.
              </p>

              <WinInset className="bg-white p-3 text-xs italic text-gray-700">
                "{developerInfo.bio}"
              </WinInset>
            </div>
          </WinWindow>

          {/* Social Links */}
          <WinWindow title="Contact & Social Media">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              {socialLinks.map((link, idx) => (
                <a
                  key={idx}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 border border-transparent hover:border-gray-400 hover:bg-gray-100 transition-all duration-200 group rounded-sm"
                >
                  <WinInset className="p-2 bg-white group-hover:bg-[#000080] group-hover:text-white transition-colors">
                    {link.icon}
                  </WinInset>

                  <div className="flex flex-col overflow-hidden">
                    <span className="text-[10px] uppercase text-gray-500 font-bold">
                      {link.label}
                    </span>

                    <span className="text-xs font-bold truncate">
                      {link.value}
                    </span>
                  </div>

                  <ExternalLink
                    size={10}
                    className="ml-auto text-gray-400 flex-shrink-0"
                  />
                </a>
              ))}
            </div>
          </WinWindow>
        </div>
      </div>

      {/* FAQ */}
      <WinWindow title="Technical Support FAQ">
        <div className="space-y-4">

          <div className="space-y-1">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <HelpCircle size={14} className="text-[#000080]" />
              How do I reset my password?
            </h3>

            <p className="text-xs text-gray-600 ml-6">
              Passwords are securely hashed. Contact the developer via email
              for account recovery assistance.
            </p>
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <MessageSquare size={14} className="text-[#000080]" />
              Reporting Bugs
            </h3>

            <p className="text-xs text-gray-600 ml-6">
              Found a bug? Send screenshots and reproduction steps to{" "}
              <span className="font-semibold">
                {developerInfo.email}
              </span>
            </p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-300 flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-center text-[10px] text-gray-400 uppercase font-bold">
          <span>Version 1.0.8 (Stable)</span>
          <span>© 2026 Sujit Kumar Pandit • All Rights Reserved</span>
        </div>
      </WinWindow>
    </motion.div>
  );
}