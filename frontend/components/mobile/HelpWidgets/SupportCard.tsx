import React from "react";

type SupportCardProps = {
  email: string;
};

export default function SupportCard({ email }: SupportCardProps) {
  return (
    <section className="px-4 py-8 bg-white text-[#0a0a0a]">
      <h2 className="font-bold text-2xl tracking-[-0.6px] mb-2">Help & Feedback</h2>
      <p className="text-sm text-[#555] leading-relaxed mb-4">
        Need support or want to share feedback? Reach out and we will help you quickly.
      </p>
      <a
        href={`mailto:${email}`}
        className="inline-flex items-center justify-center bg-[#0a0a0a] text-white font-bold text-sm px-5 py-3"
      >
        Contact Support
      </a>
    </section>
  );
}
