"use client";

import React from "react";
import {
  FileSpreadsheet,
  MousePointerClick,
  Search,
  BarChart3,
  PlayCircle,
  Download,
  Layers,
  Settings,
} from "lucide-react";
import HelpHeader from "./HelpWidgets/HelpHeader";
import HeroCard from "./HelpWidgets/HeroCard";
import SectionHeading from "./HelpWidgets/SectionHeading";
import MobileFeatureCard from "./HelpWidgets/FeatureCard";
import ControlCard from "./HelpWidgets/ControlCard";
import MobileFAQSection from "./HelpWidgets/FAQSection";
import SupportCard from "./HelpWidgets/SupportCard";
import { useMobileStore } from "@/store/useMobileStore";

type MobileHelpFeedbackProps = {
  onClose: () => void;
};

export default function MobileHelpFeedback({ onClose }: MobileHelpFeedbackProps) {
  const setHelpFaqOpenIndex = useMobileStore((state) => state.setHelpFaqOpenIndex);

  React.useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

  const handleClose = () => {
    setHelpFaqOpenIndex(null);
    onClose();
  };

  const features = [
    {
      icon: FileSpreadsheet,
      title: "Data Upload",
      description:
        "Drag and drop your Excel dataset to parse and load employee and vehicle data on the map.",
    },
    {
      icon: MousePointerClick,
      title: "Interactive Map",
      description:
        "Tap markers to see details. Vehicles show capacity and speed, employees show priority and ride sharing preferences.",
    },
    {
      icon: Search,
      title: "Quick Search",
      description:
        "Find a specific employee or vehicle and jump to that exact point on the map.",
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description:
        "Review optimization metrics like distance, total time, active stops, and estimated fuel impact.",
    },
    {
      icon: PlayCircle,
      title: "Route Simulation",
      description:
        "Visualize optimized path progress with a moving taxi and dynamic travel metrics.",
    },
    {
      icon: Download,
      title: "Export Results",
      description:
        "Download route sequences and vehicle summaries into Excel with one click.",
    },
  ];

  const mapControls = [
    {
      icon: Layers,
      title: "Bottom Control Bar",
      desc: "Toggle Employee Markers, Vehicle Markers, Office Drop-offs, and Route Paths from the bottom bar.",
    },
    {
      icon: Settings,
      title: "Theme Settings",
      desc: "Switch Light and Dark map modes from the settings menu.",
    },
  ];

  const faqs = [
    {
      question: "How do I upload employee and vehicle data?",
      answer:
        "On mobile, the upload card opens first. Tap Open internal storage, pick your Excel/CSV file, then tap Upload to load employees and vehicles on the map.",
    },
    {
      question: "How does route optimization work?",
      answer:
        "After data is uploaded, tap the center optimize button in the bottom bar. The app computes optimized routes based on capacity and trip constraints, then you can open Results or Stats.",
    },
    {
      question: "What do different markers mean?",
      answer:
        "Blue markers are employees, green markers are vehicles, and red markers are office/drop points. You can show or hide marker layers from the bottom controls/settings.",
    },
    {
      question: "Can I simulate a vehicle route?",
      answer:
        "Yes. Use Search from the bottom nav to find a vehicle, then tap View to focus it on map. After optimization, route paths are visible when route layer is enabled.",
    },
    {
      question: "How do I download optimization results?",
      answer:
        "Open Results from the bottom nav to review optimization output. For file export, use the available export/download action in your current mobile workflow after optimization.",
    },
  ];

  return (
    <div className="fixed inset-0 z-80 h-screen bg-[#0a0a0a] text-white overflow-y-auto overscroll-y-none">
      <HelpHeader onClose={handleClose} />
      <HeroCard />

      <section className="px-4 py-8 border-b border-[#1a1a1a]">
        <SectionHeading eyebrow="Core Features" />
        <div className="grid grid-cols-1 gap-3">
          {features.map((feature, index) => (
            <MobileFeatureCard key={feature.title} {...feature} index={index} />
          ))}
        </div>
      </section>

      <section className="px-4 py-8 border-b border-[#1a1a1a] bg-[#0d0d0d]">
        <SectionHeading eyebrow="Interface Guide" />
        <div className="grid grid-cols-1 gap-3">
          {mapControls.map(({ icon: Icon, title, desc }) => (
            <ControlCard key={title} icon={Icon} title={title} description={desc} />
          ))}
        </div>
      </section>

      <section className="px-4 py-8 border-b border-[#1a1a1a]">
        <SectionHeading eyebrow="FAQ" />
        <MobileFAQSection faqs={faqs} />
      </section>

      <SupportCard email="support@routeopti.com" />
    </div>
  );
}
